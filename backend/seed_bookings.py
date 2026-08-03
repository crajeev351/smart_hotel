import os
import django
import datetime

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rooms.models import Room, Booking
from django.contrib.auth import get_user_model

User = get_user_model()

# Check if bookings already exist
if Booking.objects.exists():
    print(f"Bookings already exist in database ({Booking.objects.count()} bookings). Skipping initial booking creation.")
else:
    # Get rooms
    r1 = Room.objects.filter(room_type='SINGLE').first() or Room.objects.first()
    r2 = Room.objects.filter(room_type='DOUBLE').first() or Room.objects.first()
    r3 = Room.objects.filter(room_type='DELUXE').first() or Room.objects.first()

    # Get users
    u1 = User.objects.filter(username='vikram_patel_542').first()
    u2 = User.objects.filter(username='amit_shah_283').first()
    u3 = User.objects.filter(username='jay_doe_871').first()

    if not u1 or not u2 or not u3:
        guests = list(User.objects.filter(role='GUEST'))
        while len(guests) < 3:
            g = User.objects.create_user(
                username=f"guest_sample_{len(guests)+1}",
                name=f"Sample Guest {len(guests)+1}",
                email=f"guest{len(guests)+1}@example.com",
                role='GUEST',
                password='Password123!'
            )
            guests.append(g)
        u1, u2, u3 = guests[0], guests[1], guests[2]

    if r1:
        Booking.objects.create(
            guest=u1,
            room=r1,
            check_in_date=datetime.date.today(),
            check_out_date=datetime.date.today() + datetime.timedelta(days=2),
            status='BOOKED',
            total_price=float(r1.price_per_night) * 2
        )

    if r2:
        Booking.objects.create(
            guest=u2,
            room=r2,
            check_in_date=datetime.date.today(),
            check_out_date=datetime.date.today() + datetime.timedelta(days=3),
            status='BOOKED',
            total_price=float(r2.price_per_night) * 3
        )

    if r3:
        Booking.objects.create(
            guest=u3,
            room=r3,
            check_in_date=datetime.date.today(),
            check_out_date=datetime.date.today() + datetime.timedelta(days=1),
            status='BOOKED',
            total_price=float(r3.price_per_night) * 1
        )

    print(f"Successfully seeded initial BOOKED bookings in database. Total: {Booking.objects.count()}")
