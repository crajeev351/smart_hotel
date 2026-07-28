from rest_framework import serializers
from .models import Room, Booking

class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = '__all__'

class BookingSerializer(serializers.ModelSerializer):
    guest_name = serializers.ReadOnlyField(source='guest.username')
    room_number = serializers.ReadOnlyField(source='room.room_number')

    class Meta:
        model = Booking
        fields = '__all__'

    def validate(self, attrs):
        request = self.context.get('request')
        user = request.user if request else None
        
        if user:
            status_val = attrs.get('status')
            if user.role == 'GUEST':
                if self.instance: # Updating
                    if status_val and status_val != self.instance.status:
                        if status_val in ['CHECKED_IN', 'CHECKED_OUT']:
                            raise serializers.ValidationError({'error': 'Guests are not authorized to check in or check out.'})
                else: # Creating
                    if status_val and status_val != 'BOOKED':
                        raise serializers.ValidationError({'error': 'Guests can only create bookings with status BOOKED.'})

        check_in_date = attrs.get('check_in_date')
        check_out_date = attrs.get('check_out_date')
        room = attrs.get('room')
        
        # Support partial updates
        if not check_in_date and self.instance:
            check_in_date = self.instance.check_in_date
        if not check_out_date and self.instance:
            check_out_date = self.instance.check_out_date
        if not room and self.instance:
            room = self.instance.room

        if check_in_date and check_out_date:
            if check_out_date <= check_in_date:
                raise serializers.ValidationError({'error': 'Check-out date must be after check-in date.'})
            
            # Check for overlapping bookings (excluding cancelled or checked out ones)
            overlapping = Booking.objects.filter(
                room=room,
                status__in=['BOOKED', 'CHECKED_IN'],
                check_in_date__lt=check_out_date,
                check_out_date__gt=check_in_date
            )
            
            if self.instance:
                overlapping = overlapping.exclude(id=self.instance.id)
                
            if overlapping.exists():
                raise serializers.ValidationError({'error': 'This room is already booked/occupied for the selected dates.'})
                
        return attrs