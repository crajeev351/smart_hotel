from rest_framework import serializers
from .models import Table, TableReservation, Order, OrderItem, Invoice
from menu.serializers import MenuItemSerializer

class TableSerializer(serializers.ModelSerializer):
    class Meta:
        model = Table
        fields = '__all__'

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
    booking_details = serializers.SerializerMethodField(read_only=True)
    order_details = OrderSerializer(source='orders', many=True, read_only=True)

    class Meta:
        model = Invoice
        fields = '__all__'

    def get_booking_details(self, obj):
        if obj.booking:
            return {
                'id': obj.booking.id,
                'room_number': obj.booking.room.room_number,
                'check_in_date': obj.booking.check_in_date,
                'check_out_date': obj.booking.check_out_date,
                'total_price': obj.booking.total_price,
            }
        return None
