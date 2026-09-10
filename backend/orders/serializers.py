from rest_framework import serializers
from .models import Table, TableReservation, Order, OrderItem, Invoice
from menu.serializers import MenuItemSerializer

class TableSerializer(serializers.ModelSerializer):
    current_guest_name = serializers.ReadOnlyField(source='current_guest.name')
    current_guest_username = serializers.ReadOnlyField(source='current_guest.username')
    current_guest_email = serializers.ReadOnlyField(source='current_guest.email')
    current_guest_phone = serializers.ReadOnlyField(source='current_guest.phone')
    current_guest_type = serializers.ReadOnlyField(source='current_guest.guest_type')
    current_guest_active_room = serializers.SerializerMethodField()

    class Meta:
        model = Table
        fields = '__all__'

    def get_current_guest_active_room(self, obj):
        if obj.current_guest:
            from rooms.models import Booking
            booking = Booking.objects.filter(guest=obj.current_guest, status='CHECKED_IN').first()
            if booking and booking.room:
                return booking.room.room_number
        return None

    def validate(self, data):
        if self.instance:
            # Check if there is an active BOOKED reservation for this table
            has_booked_res = TableReservation.objects.filter(table=self.instance, status='BOOKED').exists()
            if has_booked_res:
                if 'status' in data and data['status'] != self.instance.status:
                    raise serializers.ValidationError(
                        {"status": f"Table {self.instance.table_number} is reserved and its status cannot be modified directly."}
                    )
                if 'current_guest' in data and data['current_guest'] != self.instance.current_guest:
                    raise serializers.ValidationError(
                        {"current_guest": f"Table {self.instance.table_number} is reserved. Please seat the reserved guest first."}
                    )
        return data

class TableReservationSerializer(serializers.ModelSerializer):
    table_number = serializers.ReadOnlyField(source='table.table_number')

    class Meta:
        model = TableReservation
        fields = '__all__'

    def validate(self, data):
        table = data.get('table')
        status = data.get('status', 'BOOKED')
        
        if status == 'BOOKED':
            # Check if table is vacant
            if table and table.status != 'VACANT':
                raise serializers.ValidationError(
                    {"table": f"Table {table.table_number} is currently {table.get_status_display().lower()} and cannot be reserved."}
                )
            
            # Check if there's already a BOOKED reservation for this table
            existing_booking = TableReservation.objects.filter(table=table, status='BOOKED')
            if self.instance:
                existing_booking = existing_booking.exclude(pk=self.instance.pk)
            if existing_booking.exists():
                raise serializers.ValidationError(
                    {"table": f"Table {table.table_number} is already reserved."}
                )
        return data

class OrderItemSerializer(serializers.ModelSerializer):
    menu_item_details = MenuItemSerializer(source='menu_item', read_only=True)

    class Meta:
        model = OrderItem
        fields = '__all__'

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    guest_name = serializers.ReadOnlyField(source='guest.username')
    table_number = serializers.ReadOnlyField(source='table.table_number')

    class Meta:
        model = Order
        fields = '__all__'

class InvoiceSerializer(serializers.ModelSerializer):
    guest_name = serializers.ReadOnlyField(source='guest.username')
    guest_full_name = serializers.ReadOnlyField(source='guest.name')
    guest_email = serializers.ReadOnlyField(source='guest.email')
    booking_details = serializers.SerializerMethodField(read_only=True)
    order_details = OrderSerializer(source='orders', many=True, read_only=True)
    itemized_items = serializers.SerializerMethodField(read_only=True)
    tax_breakdown = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Invoice
        fields = '__all__'

    def get_booking_details(self, obj):
        if obj.booking:
            from datetime import date
            price_per_night = float(obj.booking.room.price_per_night or 0)
            check_in = obj.booking.check_in_date
            check_out = obj.booking.check_out_date
            delta_days = (date.today() - check_in).days if check_in else 1
            nights = max(1, delta_days + 1)
            return {
                'id': obj.booking.id,
                'room_number': obj.booking.room.room_number,
                'room_type': obj.booking.room.get_room_type_display(),
                'check_in_date': check_in,
                'check_out_date': check_out,
                'price_per_night': str(price_per_night),
                'nights': nights,
                'total_price': obj.booking.total_price,
            }
        return None

    def get_itemized_items(self, obj):
        items = []
        for order in obj.orders.all():
            for item in order.items.exclude(status='CANCELLED'):
                items.append({
                    'id': item.id,
                    'name': item.menu_item.name,
                    'quantity': item.quantity,
                    'unit_price': str(item.price_at_order),
                    'total_price': str(round(item.quantity * item.price_at_order, 2)),
                    'is_veg': item.menu_item.is_veg,
                    'status': item.status,
                    'notes': item.notes or '',
                })
        return items

    def get_tax_breakdown(self, obj):
        room_charges = float(obj.room_charges or 0.0)
        food_charges = float(obj.food_charges or 0.0)

        # Standard hospitality GST rates:
        # Restaurant food: 5% GST (2.5% CGST + 2.5% SGST)
        # Hotel room stay: 12% GST (or 18% if > 7500/night)
        price_per_night = float(obj.booking.room.price_per_night or 0) if obj.booking else 0.0
        room_tax_rate = 18.0 if price_per_night > 7500 else 12.0
        food_tax_rate = 5.0

        room_tax = round(room_charges * (room_tax_rate / 100.0), 2) if room_charges > 0 else 0.0
        food_tax = round(food_charges * (food_tax_rate / 100.0), 2) if food_charges > 0 else 0.0

        return {
            'room_tax_rate_percent': room_tax_rate if room_charges > 0 else 0.0,
            'room_tax_amount': room_tax,
            'food_tax_rate_percent': food_tax_rate if food_charges > 0 else 0.0,
            'food_tax_amount': food_tax,
            'total_tax': float(obj.tax_amount or (room_tax + food_tax)),
        }
