import threading
from django.utils import timezone
from django.core.cache import cache
from django.db import connection
from rooms.models import Booking, Room

# Paths that must never be delayed by background maintenance checks
BYPASS_PREFIXES = (
    '/api/health',
    '/health',
    '/api/token',
    '/static',
    '/media',
    '/favicon.ico',
)

class AutoUpdateBookingStatusMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # 1. Immediately bypass for lightweight, auth, or static endpoints
        if not request.path.startswith(BYPASS_PREFIXES):
            # Throttle auto-update check to once every 60 seconds
            cache_key = 'last_booking_auto_update'
            if not cache.get(cache_key):
                cache.set(cache_key, True, timeout=60)
                # Run asynchronously in background thread so HTTP response is instant
                threading.Thread(target=self._run_async_update, daemon=True).start()

        return self.get_response(request)

    def _run_async_update(self):
        try:
            self.auto_update_statuses()
        except Exception as e:
            pass
        finally:
            connection.close()

    def auto_update_statuses(self):
        today = timezone.localdate()
        now = timezone.now()

        # 1. Auto-check-in: find all 'BOOKED' bookings whose check_in_date is today or in the past
        due_checkins = list(Booking.objects.filter(status='BOOKED', check_in_date__lte=today))
        if due_checkins:
            booking_ids = [b.id for b in due_checkins]
            room_ids = [b.room_id for b in due_checkins if b.room_id]
            Booking.objects.filter(id__in=booking_ids, actual_check_in__isnull=True).update(actual_check_in=now)
            Booking.objects.filter(id__in=booking_ids).update(status='CHECKED_IN')
            if room_ids:
                Room.objects.filter(id__in=room_ids).exclude(status='OCCUPIED').update(status='OCCUPIED')

        # 2. Auto-check-out: find all 'CHECKED_IN' bookings whose check_out_date is in the past
        due_checkouts = list(Booking.objects.filter(status='CHECKED_IN', check_out_date__lt=today))
        if due_checkouts:
            checkout_ids = [b.id for b in due_checkouts]
            room_ids = set(b.room_id for b in due_checkouts if b.room_id)
            Booking.objects.filter(id__in=checkout_ids, actual_check_out__isnull=True).update(actual_check_out=now)
            Booking.objects.filter(id__in=checkout_ids).update(status='CHECKED_OUT')

            for r_id in room_ids:
                if not Booking.objects.filter(room_id=r_id, status='CHECKED_IN').exists():
                    Room.objects.filter(id=r_id).exclude(status='MAINTENANCE').update(status='MAINTENANCE')

