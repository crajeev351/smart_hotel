from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.utils.html import escape
from .models import Table, TableReservation, Order, OrderItem, Invoice
from .serializers import TableSerializer, TableReservationSerializer, OrderSerializer, OrderItemSerializer, InvoiceSerializer
from rooms.models import Booking, Room
from menu.models import MenuItem
from accounts.email_utils import send_configured_mail
from .invoice_email import generate_invoice_email

from django.db import transaction

User = get_user_model()

class TableViewSet(viewsets.ModelViewSet):
    queryset = Table.objects.all()
    serializer_class = TableSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_update(self, serializer):
        # Store original values
        instance = self.get_object()
        old_status = instance.status
        old_guest = instance.current_guest

        # Save updates
        updated_instance = serializer.save()

        # If transitioning to VACANT/UNDER_CLEANING or current_guest is set to None/null
        is_now_vacant = updated_instance.status in ['VACANT', 'UNDER_CLEANING']
        guest_removed = old_guest is not None and updated_instance.current_guest is None

        if is_now_vacant or guest_removed:
            # 1. Cancel all active orders for this table
            active_orders = Order.objects.filter(
                table=updated_instance,
                status__in=['PENDING', 'PREPARING', 'READY', 'SERVED']
            )
            for order in active_orders:
                order.status = 'CANCELLED'
                order.items.all().update(status='CANCELLED')
                # Unlink from table when cancelled
                order.table = None
                order.save()

            # 2. Delete any pending DINE_IN invoices for the old guest (or current guest if none)
            target_guest = old_guest or updated_instance.current_guest
            if target_guest:
                Invoice.objects.filter(
                    guest=target_guest,
                    guest_type_at_billing='DINE_IN',
                    payment_status='PENDING'
                ).delete()

class TableReservationViewSet(viewsets.ModelViewSet):
    queryset = TableReservation.objects.all().order_by('-reservation_time')
    serializer_class = TableReservationSerializer
    permission_classes = [permissions.IsAuthenticated]

class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Order.objects.all().order_by('-created_at')
        table_number = self.request.query_params.get('table_number')
        status_param = self.request.query_params.get('status')
        guest_id = self.request.query_params.get('guest')

        if table_number:
            queryset = queryset.filter(table__table_number=table_number)
        if guest_id:
            queryset = queryset.filter(guest_id=guest_id)
        if status_param:
            if status_param == 'IN_PROGRESS':
                queryset = queryset.filter(
                    status__in=['PENDING', 'PREPARING', 'READY', 'SERVED'],
                    items__status__in=['PENDING', 'PREPARING', 'READY', 'SERVED']
                ).distinct()
            else:
                queryset = queryset.filter(status=status_param)
        return queryset

    def perform_create(self, serializer):
        serializer.save(guest=self.request.user)

    def perform_update(self, serializer):
        instance = serializer.save()
        if instance.status == 'CANCELLED':
            instance.items.all().update(status='CANCELLED')
            # Reset table status if needed
            table = instance.table
            if table:
                other_active = Order.objects.filter(table=table, status__in=['PENDING', 'PREPARING', 'READY', 'SERVED']).exclude(pk=instance.pk)
                if not other_active.exists():
                    table.status = 'VACANT'
                    table.current_guest = None
                    table.save()

    @action(detail=False, methods=['post'], url_path='place-order')
    @transaction.atomic
    def place_order(self, request):
        table_number = request.data.get('table_number')
        guest_id = request.data.get('guest_id')
        items = request.data.get('items', [])

        if not table_number:
            return Response({'error': 'table_number is required'}, status=status.HTTP_400_BAD_REQUEST)
        if not items:
            return Response({'error': 'items list is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Pre-validate menu items
        validated_items = []
        for item in items:
            menu_item_id = item.get('menu_item_id')
            quantity = int(item.get('quantity', 1))
            notes = item.get('notes', '')
            try:
                menu_item = MenuItem.objects.get(id=menu_item_id)
            except MenuItem.DoesNotExist:
                return Response({'error': f'Menu item {menu_item_id} not found.'}, status=status.HTTP_400_BAD_REQUEST)
            validated_items.append({
                'menu_item': menu_item,
                'quantity': quantity,
                'notes': notes
            })

        # Get table
        table = get_object_or_404(Table, table_number=table_number)

        # Check if the table is reserved
        if TableReservation.objects.filter(table=table, status='BOOKED').exists():
            return Response(
                {'error': f'Table {table.table_number} is reserved. Please seat the reserved guest first.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get guest
        if guest_id:
            guest = get_object_or_404(User, id=guest_id)
            if table.current_guest != guest:
                table.current_guest = guest
                table.status = 'OCCUPIED'
                table.save()
        elif table.current_guest:
            guest = table.current_guest
        elif request.user.is_authenticated and request.user.role == 'GUEST':
            guest = request.user
            if not table.current_guest:
                table.current_guest = guest
                table.status = 'OCCUPIED'
                table.save()
        else:
            return Response(
                {'error': f'Table {table.table_number} is not assigned to any guest. Please assign a guest to the table before placing an order.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Dynamic guest type update: If guest is STAY_IN and has active booking, update to BOTH
        active_booking = Booking.objects.filter(guest=guest, status='CHECKED_IN').first()
        if active_booking and guest.guest_type == 'STAY_IN':
            guest.guest_type = 'BOTH'
            guest.save()

        # Find or create active order for this table
        # Active order is not completed/cancelled
        active_order = Order.objects.filter(
            table=table, 
            guest=guest,
            status__in=['PENDING', 'PREPARING', 'READY', 'SERVED']
        ).first()

        if not active_order:
            active_order = Order.objects.create(
                guest=guest,
                table=table,
                status='PENDING'
            )
            table.status = 'OCCUPIED'
            table.save()

        # Create order items
        for v in validated_items:
            OrderItem.objects.create(
                order=active_order,
                menu_item=v['menu_item'],
                quantity=v['quantity'],
                price_at_order=v['menu_item'].price,
                notes=v['notes']
            )

        # Recalculate total
        total = sum(i.quantity * i.price_at_order for i in active_order.items.all())
        active_order.total_amount = total
        active_order.save()

        serializer = self.get_serializer(active_order)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class OrderItemViewSet(viewsets.ModelViewSet):
    queryset = OrderItem.objects.all()
    serializer_class = OrderItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_update(self, serializer):
        instance = serializer.save()
        order = instance.order
        # Recalculate order total excluding cancelled items
        total = sum(i.quantity * i.price_at_order for i in order.items.exclude(status='CANCELLED'))
        order.total_amount = total

        # Synchronize order status with active items
        active_items = order.items.exclude(status='CANCELLED')
        if not active_items.exists():
            order.status = 'CANCELLED'
            table = order.table
            if table:
                other_active = Order.objects.filter(table=table, status__in=['PENDING', 'PREPARING', 'READY', 'SERVED']).exclude(pk=order.pk)
                if not other_active.exists():
                    table.status = 'VACANT'
                    table.current_guest = None
                    table.save()
        elif all(i.status == 'SERVED' for i in active_items):
            order.status = 'SERVED'
        elif any(i.status == 'READY' for i in active_items):
            order.status = 'READY'
        elif any(i.status == 'PREPARING' for i in active_items):
            order.status = 'PREPARING'
        else:
            order.status = 'PENDING'
        order.save()

class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Invoice.objects.all()
        guest_id = self.request.query_params.get('guest')
        payment_status = self.request.query_params.get('payment_status')
        if guest_id:
            queryset = queryset.filter(guest_id=guest_id)
        if payment_status:
            queryset = queryset.filter(payment_status=payment_status)
        return queryset

    @action(detail=False, methods=['post'], url_path='generate-bill')
    def generate_bill(self, request):
        guest_id = request.data.get('guest_id')
        billing_type = request.data.get('billing_type', 'CHECKOUT')
        if not guest_id:
            return Response({'error': 'guest_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        guest = get_object_or_404(User, id=guest_id)

        # 1. Booking charges (only for general hotel checkout, not dine-in)
        booking = Booking.objects.filter(guest=guest, status='CHECKED_IN').first()
        room_charges = 0.00
        room_tax = 0.00
        if booking and billing_type != 'DINE_IN':
            from datetime import date
            today = date.today()
            delta = today - booking.check_in_date
            nights = max(1, delta.days + 1)
            price_per_night = float(booking.room.price_per_night)
            room_charges = price_per_night * nights
            booking.total_price = room_charges
            booking.save()

            # Room GST rate: 12% standard, 18% if room tariff > ₹7,500/night
            room_tax_rate = 0.18 if price_per_night > 7500 else 0.12
            room_tax = round(room_charges * room_tax_rate, 2)

        # 2. Food charges
        # For dine-in: table orders
        # For general checkout: ALL orders from this guest during this stay (including room-charged orders and active orders)
        if billing_type == 'DINE_IN':
            table = Table.objects.filter(current_guest=guest).first()
            if table:
                active_orders = Order.objects.filter(table=table, status__in=['PENDING', 'PREPARING', 'READY', 'SERVED'])
            else:
                active_orders = Order.objects.filter(guest=guest, status__in=['PENDING', 'PREPARING', 'READY', 'SERVED'])
        else:
            # Hotel checkout: include all orders linked to this guest's stay (active, served, or completed from room charges)
            if booking:
                booking_invoices = Invoice.objects.filter(booking=booking)
                invoice_orders = Order.objects.filter(invoices__in=booking_invoices)
                guest_orders = Order.objects.filter(guest=guest, created_at__date__gte=booking.check_in_date).exclude(status='CANCELLED')
                active_orders = (invoice_orders | guest_orders).distinct()
            else:
                active_orders = Order.objects.filter(guest=guest).exclude(status='CANCELLED')

        food_charges = 0.00
        for o in active_orders:
            items_to_bill = o.items.exclude(status='CANCELLED')
            for itm in items_to_bill:
                if itm.status != 'SERVED' and itm.status != 'COMPLETED':
                    itm.status = 'SERVED'
                    itm.save()
            food_charges += sum(float(i.quantity * i.price_at_order) for i in items_to_bill)

        # Food GST rate: 5% GST on restaurant food orders
        food_tax = round(food_charges * 0.05, 2)

        # 3. Calculate total tax and grand total
        tax_amount = round(room_tax + food_tax, 2)
        total_amount = round(float(room_charges) + float(food_charges) + tax_amount, 2)

        # Delete any existing pending invoice of the same billing_type for this guest before creating the new one
        Invoice.objects.filter(
            guest=guest,
            guest_type_at_billing=billing_type,
            payment_status='PENDING'
        ).delete()

        # Create invoice
        invoice = Invoice.objects.create(
            guest=guest,
            booking=booking if billing_type != 'DINE_IN' else None,
            guest_type_at_billing=billing_type,
            room_charges=room_charges,
            food_charges=food_charges,
            tax_amount=tax_amount,
            total_amount=total_amount,
            payment_status='PENDING'
        )

        if active_orders.exists():
            invoice.orders.set(active_orders)
            if billing_type == 'DINE_IN':
                for order in active_orders:
                    order.items.exclude(status='SERVED').update(status='CANCELLED')
                    order.status = 'SERVED'
                    order.guest = guest
                    order.save()

        serializer = self.get_serializer(invoice)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='pay-invoice')
    def pay_invoice(self, request, pk=None):
        invoice = self.get_object()
        if invoice.payment_status == 'PAID':
            return Response({'error': 'Invoice is already paid'}, status=status.HTTP_400_BAD_REQUEST)

        invoice.payment_status = 'PAID'
        invoice.save()

        # Update Booking if any
        if invoice.booking:
            booking = invoice.booking
            booking.status = 'CHECKED_OUT'
            booking.actual_check_out = timezone.now()
            booking.save()

            # Room status transitions to UNDER_CLEANING
            room = booking.room
            room.status = 'MAINTENANCE' # Maintenance represents Under Cleaning in current choices
            room.save()

            # Mark all pending dine-in / room-charge invoices for this booking as PAID
            Invoice.objects.filter(booking=booking, payment_status='PENDING').update(payment_status='PAID')

        # Update orders to COMPLETED
        for order in invoice.orders.all():
            order.items.exclude(status='SERVED').update(status='CANCELLED')
            order.status = 'COMPLETED'
            if order.table:
                table = order.table
                table.status = 'VACANT'
                table.current_guest = None
                table.save()
                order.table = None
            order.save()

        # Also ensure any table still assigned to the guest is freed
        Table.objects.filter(current_guest=invoice.guest).update(status='VACANT', current_guest=None)

        # Send Invoice via Email
        email_sent = False
        email_error = None
        try:
            recipient_email = (invoice.guest.email or '').strip()
            if not recipient_email and '@' in (invoice.guest.username or ''):
                recipient_email = invoice.guest.username.strip()

            if not recipient_email:
                email_error = "Guest email address is missing."
                print(f"Cannot send invoice email: {email_error}")
            else:
                email_body, html_body = generate_invoice_email(invoice)
                send_configured_mail(
                    subject=f'Smart Hotel Payment Receipt - INV-{invoice.id}',
                    message=email_body,
                    recipient_list=[recipient_email],
                    html_message=html_body,
                )
                email_sent = True
        except Exception as e:
            email_error = str(e)
            print(f"Error sending invoice email: {e}")

        serializer = self.get_serializer(invoice)
        response_data = serializer.data
        response_data['email_sent'] = email_sent
        if email_error:
            response_data['email_error'] = email_error
        return Response(response_data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='charge-to-room')
    def charge_to_room(self, request, pk=None):
        invoice = self.get_object()
        if invoice.payment_status == 'PAID':
            return Response({'error': 'Invoice is already paid'}, status=status.HTTP_400_BAD_REQUEST)

        # Get guest's active stay booking
        booking = Booking.objects.filter(guest=invoice.guest, status='CHECKED_IN').first()
        if not booking:
            return Response({'error': 'Guest does not have an active room check-in to charge to.'}, status=status.HTTP_400_BAD_REQUEST)

        # Link invoice to booking and mark as ROOM_CHARGE
        invoice.booking = booking
        invoice.guest_type_at_billing = 'ROOM_CHARGE'
        invoice.payment_status = 'PENDING'
        invoice.save()

        # Release the table so it can be used again
        for order in invoice.orders.all():
            order.items.exclude(status='SERVED').update(status='CANCELLED')
            order.status = 'COMPLETED'
            if order.table:
                table = order.table
                table.status = 'VACANT'
                table.current_guest = None
                table.save()
                order.table = None
            order.save()

        # Free all tables assigned to this guest
        Table.objects.filter(current_guest=invoice.guest).update(status='VACANT', current_guest=None)

        serializer = self.get_serializer(invoice)
        return Response(serializer.data, status=status.HTTP_200_OK)
