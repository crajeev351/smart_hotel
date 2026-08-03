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
    def place_order(self, request):
        table_number = request.data.get('table_number')
        guest_id = request.data.get('guest_id')
        items = request.data.get('items', [])

        if not table_number:
            return Response({'error': 'table_number is required'}, status=status.HTTP_400_BAD_REQUEST)
        if not items:
            return Response({'error': 'items list is required'}, status=status.HTTP_400_BAD_REQUEST)

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
        elif table.current_guest:
            guest = table.current_guest
        else:
            guest = request.user

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
        for item in items:
            menu_item_id = item.get('menu_item_id')
            quantity = int(item.get('quantity', 1))
            notes = item.get('notes', '')

            menu_item = get_object_or_404(MenuItem, id=menu_item_id)
            OrderItem.objects.create(
                order=active_order,
                menu_item=menu_item,
                quantity=quantity,
                price_at_order=menu_item.price,
                notes=notes
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
        order.save()

        # If all items in this order are cancelled, cancel the order itself
        if not order.items.exclude(status='CANCELLED').exists():
            order.status = 'CANCELLED'
            order.save()

            # Reset table status if needed
            table = order.table
            if table:
                other_active = Order.objects.filter(table=table, status__in=['PENDING', 'PREPARING', 'READY', 'SERVED']).exclude(pk=order.pk)
                if not other_active.exists():
                    table.status = 'VACANT'
                    table.current_guest = None
                    table.save()

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
        if booking and billing_type != 'DINE_IN':
            from datetime import date
            # Nights calculation based on actual stay duration
            today = date.today()
            delta = today - booking.check_in_date
            # Check-in day is counted as day 1. 
            # If today == check_in_date, delta.days is 0, so max(1, 0+1) -> 1 day charge
            # If today is 1 day after check_in_date, delta.days is 1 -> 2 days charge
            # Wait, standard hotel billing: checkout on same day = 1 night (or day charge). 
            # Checkout next day = 1 night. But user says "first day = 100, secound day = 200".
            # So if check-in is 10th, checkout on 10th (first day) -> 1 day.
            # Checkout on 11th (second day) -> 2 days.
            nights = max(1, delta.days + 1)
            room_charges = float(booking.room.price_per_night) * nights
            booking.total_price = room_charges
            booking.save()

        # 2. Food charges (only count dishes that have been SERVED)
        # For dine-in, calculate based on all active orders linked to the table the guest is sitting at
        if billing_type == 'DINE_IN':
            table = Table.objects.filter(current_guest=guest).first()
            if table:
                active_orders = Order.objects.filter(table=table, status__in=['PENDING', 'PREPARING', 'READY', 'SERVED'])
            else:
                active_orders = Order.objects.filter(guest=guest, status__in=['PENDING', 'PREPARING', 'READY', 'SERVED'])
        else:
            active_orders = Order.objects.filter(guest=guest, status__in=['PENDING', 'PREPARING', 'READY', 'SERVED'])

        food_charges = 0.00
        for o in active_orders:
            food_charges += sum(float(i.quantity * i.price_at_order) for i in o.items.filter(status='SERVED'))

        # 3. Calculate tax (10%)
        subtotal = float(room_charges) + float(food_charges)
        tax_amount = subtotal * 0.10
        total_amount = subtotal + tax_amount

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
            for order in active_orders:
                # Cancel any non-served items when billing is generated
                order.items.exclude(status='SERVED').update(status='CANCELLED')
                order.status = 'SERVED'
                if billing_type == 'DINE_IN':
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

            # Mark all pending dine-in invoices for this booking as PAID
            Invoice.objects.filter(booking=booking, payment_status='PENDING').update(payment_status='PAID')

        # Update orders to COMPLETED
        for order in invoice.orders.all():
            # Cancel any non-served items
            order.items.exclude(status='SERVED').update(status='CANCELLED')
            order.status = 'COMPLETED'
            if order.table:
                table = order.table
                table.status = 'UNDER_CLEANING'
                table.current_guest = None
                table.save()
                order.table = None
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
        if booking and billing_type != 'DINE_IN':
            from datetime import date
            # Nights calculation based on actual stay duration
            today = date.today()
            delta = today - booking.check_in_date
            # Check-in day is counted as day 1. 
            # If today == check_in_date, delta.days is 0, so max(1, 0+1) -> 1 day charge
            # If today is 1 day after check_in_date, delta.days is 1 -> 2 days charge
            # Wait, standard hotel billing: checkout on same day = 1 night (or day charge). 
            # Checkout next day = 1 night. But user says "first day = 100, secound day = 200".
            # So if check-in is 10th, checkout on 10th (first day) -> 1 day.
            # Checkout on 11th (second day) -> 2 days.
            nights = max(1, delta.days + 1)
            room_charges = float(booking.room.price_per_night) * nights
            booking.total_price = room_charges
            booking.save()

        # 2. Food charges (only count dishes that have been SERVED)
        # For dine-in, calculate based on all active orders linked to the table the guest is sitting at
        if billing_type == 'DINE_IN':
            table = Table.objects.filter(current_guest=guest).first()
            if table:
                active_orders = Order.objects.filter(table=table, status__in=['PENDING', 'PREPARING', 'READY', 'SERVED'])
            else:
                active_orders = Order.objects.filter(guest=guest, status__in=['PENDING', 'PREPARING', 'READY', 'SERVED'])
        else:
            active_orders = Order.objects.filter(guest=guest, status__in=['PENDING', 'PREPARING', 'READY', 'SERVED'])

        food_charges = 0.00
        for o in active_orders:
            food_charges += sum(float(i.quantity * i.price_at_order) for i in o.items.filter(status='SERVED'))

        # 3. Calculate tax (10%)
        subtotal = float(room_charges) + float(food_charges)
        tax_amount = subtotal * 0.10
        total_amount = subtotal + tax_amount

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
            for order in active_orders:
                # Cancel any non-served items when billing is generated
                order.items.exclude(status='SERVED').update(status='CANCELLED')
                order.status = 'SERVED'
                if billing_type == 'DINE_IN':
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

            # Mark all pending dine-in invoices for this booking as PAID
            Invoice.objects.filter(booking=booking, payment_status='PENDING').update(payment_status='PAID')

        # Update orders to COMPLETED
        for order in invoice.orders.all():
            # Cancel any non-served items
            order.items.exclude(status='SERVED').update(status='CANCELLED')
            order.status = 'COMPLETED'
            if order.table:
                table = order.table
                table.status = 'UNDER_CLEANING'
                table.current_guest = None
                table.save()
                order.table = None
            order.save()

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

        # Link invoice to booking
        invoice.booking = booking
        invoice.payment_status = 'PENDING'
        invoice.save()

        # Release the table so it can be used again
        for order in invoice.orders.all():
            # Cancel any non-served items
            order.items.exclude(status='SERVED').update(status='CANCELLED')
            # Keep order status as SERVED so it stays in reception check-out calculations
            order.status = 'SERVED'
            if order.table:
                table = order.table
                table.status = 'UNDER_CLEANING'
                table.current_guest = None
                table.save()

                # Unlink order from table so table is vacant
                order.table = None
            order.save()

        serializer = self.get_serializer(invoice)
        return Response(serializer.data, status=status.HTTP_200_OK)
