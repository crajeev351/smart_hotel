import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rooms.models import Room

# Clear existing rooms
Room.objects.all().delete()

room_types = {
    'SINGLE': {'price': 100, 'capacity': 1},
    'DOUBLE': {'price': 150, 'capacity': 2},
    'DELUXE': {'price': 250, 'capacity': 4}
}

rooms_to_create = []
for floor in range(1, 5):
    # Floor 1 & 2 get 15 rooms, Floor 3 & 4 get 10 rooms
    num_rooms = 15 if floor in [1, 2] else 10
    for r_num in range(1, num_rooms + 1):
        room_number = f"{floor}{r_num:02d}"  # 101 to 115, 201 to 215, 301 to 310, etc.
        if r_num <= 6 if floor in [1, 2] else r_num <= 4:
            rtype = 'SINGLE'
        elif r_num <= 11 if floor in [1, 2] else r_num <= 8:
            rtype = 'DOUBLE'
        else:
            rtype = 'DELUXE'
            
        rooms_to_create.append(Room(
            room_number=room_number,
            room_type=rtype,
            price_per_night=room_types[rtype]['price'],
            capacity=room_types[rtype]['capacity'],
            status='AVAILABLE',
            floor=floor
        ))

Room.objects.bulk_create(rooms_to_create)
print(f"Successfully created {Room.objects.count()} rooms in database.")
