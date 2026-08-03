import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rooms.models import Room

room_types = {
    'SINGLE': {'price': 100, 'capacity': 1},
    'DOUBLE': {'price': 150, 'capacity': 2},
    'DELUXE': {'price': 250, 'capacity': 4}
}

created_count = 0
for floor in range(1, 5):
    # Floor 1 & 2 get 15 rooms, Floor 3 & 4 get 10 rooms
    num_rooms = 15 if floor in [1, 2] else 10
    for r_num in range(1, num_rooms + 1):
        room_number = f"{floor}{r_num:02d}"
        if r_num <= (6 if floor in [1, 2] else 4):
            rtype = 'SINGLE'
        elif r_num <= (11 if floor in [1, 2] else 8):
            rtype = 'DOUBLE'
        else:
            rtype = 'DELUXE'

        obj, created = Room.objects.get_or_create(
            room_number=room_number,
            defaults={
                'room_type': rtype,
                'price_per_night': room_types[rtype]['price'],
                'capacity': room_types[rtype]['capacity'],
                'status': 'AVAILABLE',
                'floor': floor
            }
        )
        if created:
            created_count += 1

print(f"Rooms check complete. New rooms created: {created_count}. Total rooms: {Room.objects.count()}.")
