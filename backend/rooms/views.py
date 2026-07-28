from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from .models import Room, Booking
from .serializers import RoomSerializer, BookingSerializer
from .permissions import IsAdmin, IsReceptionistOrAdmin, IsBookingOwnerOrStaff

class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer

    def get_permissions(self):
        # Only receptionist or admin can write (create/update/delete) rooms
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsReceptionistOrAdmin()]
        return [permissions.IsAuthenticated()]

class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.all()
    serializer_class = BookingSerializer

    def get_permissions(self):
        # Enforce check-in/owner restrictions for updates or deletions
        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsBookingOwnerOrStaff()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'GUEST':
            return Booking.objects.filter(guest=user)
        elif user.role in ['ADMIN', 'RECEPTION']:
            return Booking.objects.all()
        else:
            return Booking.objects.none()

    def perform_create(self, serializer):
        # Automatically set the guest if it's not provided or ensure it's the current user for GUEST role
        if self.request.user.role == 'GUEST':
            booking = serializer.save(guest=self.request.user, status='BOOKED')
        else:
            booking = serializer.save()
        
        # If check-in state is active immediately, set room status to OCCUPIED
        if booking.status == 'CHECKED_IN':
            room = booking.room
            room.status = 'OCCUPIED'
            room.save()

    def perform_update(self, serializer):
        booking = serializer.save()
        room = booking.room
        if booking.status == 'CHECKED_IN':
            room.status = 'OCCUPIED'
            room.save()
        elif booking.status == 'CHECKED_OUT':
            room.status = 'MAINTENANCE'
            room.save()
        elif booking.status in ['CANCELLED', 'CHECKED_OUT']:
            # Double check if any other active stay is in this room before setting to AVAILABLE
            active_stays = Booking.objects.filter(room=room, status__in=['BOOKED', 'CHECKED_IN']).exclude(id=booking.id)
            if not active_stays.exists():
                room.status = 'AVAILABLE'
                room.save()

    def perform_destroy(self, instance):
        room = instance.room
        status_to_free = instance.status
        instance.delete()
        
        # Free up the room if no other active bookings exist for it
        if status_to_free in ['BOOKED', 'CHECKED_IN']:
            active_stays = Booking.objects.filter(room=room, status__in=['BOOKED', 'CHECKED_IN'])
            if not active_stays.exists():
                room.status = 'AVAILABLE'
                room.save()


@login_required
def rooms_page(request):
    if request.method == 'POST':
        # 1. Update Room
        update_id = request.POST.get('update_id')
        new_price = request.POST.get('price')
        new_status = request.POST.get('status')
        if update_id and new_price and new_status:
            try:
                room = Room.objects.get(id=update_id)
                room.price_per_night = new_price
                room.status = new_status
                room.save()
            except Room.DoesNotExist:
                pass
            return redirect('rooms')

        # 2. Delete Room
        delete_id = request.POST.get('delete_id')
        if delete_id:
            try:
                room = Room.objects.get(id=delete_id)
                room.delete()
            except Room.DoesNotExist:
                pass
            return redirect('rooms')

        # 3. Create Room
        room_number = request.POST.get('room_number')
        room_type = request.POST.get('room_type')
        price = request.POST.get('price')
        capacity = request.POST.get('capacity')
        floor = request.POST.get('floor')
        status_val = request.POST.get('status')

        if room_number and room_type and price and capacity:
            Room.objects.create(
                room_number=room_number,
                room_type=room_type,
                price_per_night=price,
                capacity=capacity,
                floor=floor or 1,
                status=status_val or 'AVAILABLE'
            )
            return redirect('rooms')

    rooms = Room.objects.all().order_by('room_number')
    return render(request, 'rooms.html', {'rooms': rooms})
