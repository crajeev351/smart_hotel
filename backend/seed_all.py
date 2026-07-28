import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounts.models import CustomUser

users = [
    {
        "username": "Rajeev7112",
        "email": "rajeev7112@smarthotel.com",
        "name": "Rajeev (Admin)",
        "phone": "+1234567890",
        "role": "ADMIN",
        "password": "Rajeev123!",
        "is_staff": True,
        "is_superuser": True
    },
    {
        "username": "reception_test",
        "email": "reception@smarthotel.com",
        "name": "Reception Desk Staff",
        "phone": "+1234567891",
        "role": "RECEPTION",
        "password": "Password123!",
        "is_staff": False,
        "is_superuser": False
    },
    {
        "username": "waiter_test",
        "email": "waiter@smarthotel.com",
        "name": "Floor Waiter Staff",
        "phone": "+1234567892",
        "role": "WAITER",
        "password": "Password123!",
        "is_staff": False,
        "is_superuser": False
    },
    {
        "username": "kitchen_test",
        "email": "kitchen@smarthotel.com",
        "name": "Kitchen Display Staff",
        "phone": "+1234567893",
        "role": "KITCHEN",
        "password": "Password123!",
        "is_staff": False,
        "is_superuser": False
    },
    {
        "username": "janitor_test",
        "email": "janitor@smarthotel.com",
        "name": "Cleaning Janitor Staff",
        "phone": "+1234567894",
        "role": "JANITOR",
        "password": "Password123!",
        "is_staff": False,
        "is_superuser": False
    }
]

for u in users:
    user, created = CustomUser.objects.get_or_create(
        username=u["username"],
        defaults={
            "email": u["email"],
            "name": u["name"],
            "phone": u["phone"],
            "role": u["role"],
            "is_staff": u.get("is_staff", False),
            "is_superuser": u.get("is_superuser", False)
        }
    )
    if created:
        user.set_password(u["password"])
        user.save()
        print(f"Created user: {u['username']}")
    else:
        # Ensure password matches
        user.set_password(u["password"])
        user.role = u["role"]
        user.save()
        print(f"Updated user: {u['username']}")

# Run existing seed scripts if available
try:
    import seed_rooms
    import seed_tables
    import seed_bookings
except Exception as e:
    print(f"Additional seeding: {e}")

print("✅ All default testing users and database records seeded successfully!")
