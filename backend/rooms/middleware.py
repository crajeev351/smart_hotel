from django.utils import timezone
from rooms.models import Booking, Room

class AutoUpdateBookingStatusMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Run auto-update on every request to keep database state synchronized across all views (API, Admin, HTML templates)
        self.auto_update_statuses()
        
        response = self.get_response(request)
        return response

    def auto_update_statuses(self):
        today = timezone.localdate()
        now = timezone.now()

        # 1. Auto-check-in: find all 'BOOKED' bookings whose check_in_date is today or in the past
        due_checkins = Booking.objects.filter(status='BOOKED', check_in_date__lte=today)
        for booking in due_checkins:
            booking.status = 'CHECKED_IN'
            if not booking.actual_check_in:
                booking.actual_check_in = now
            booking.save()

            # Update the room status to OCCUPIED
            room = booking.room
            if room.status != 'OCCUPIED':
                room.status = 'OCCUPIED'
                room.save()

        # 2. Auto-check-out: find all 'CHECKED_IN' bookings whose check_out_date is in the past
        due_checkouts = Booking.objects.filter(status='CHECKED_IN', check_out_date__lt=today)
        for booking in due_checkouts:
            booking.status = 'CHECKED_OUT'
            if not booking.actual_check_out:
                booking.actual_check_out = now
            booking.save()

            # Update the room status to MAINTENANCE (if no other check_in stays exist for this room)
            room = booking.room
            active_stays = Booking.objects.filter(room=room, status='CHECKED_IN').exclude(id=booking.id)
            if not active_stays.exists():
                if room.status != 'MAINTENANCE':
                    room.status = 'MAINTENANCE'
                    room.save()
