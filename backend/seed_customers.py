import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounts.models import CustomUser

customers_data = [
    {
        "username": "vikram_patel_542",
        "name": "vikram patel",
        "phone": "+919876543210",
        "email": "vikram.patel@gmail.com",
        "role": "GUEST",
        "guest_type": "BOTH"
    },
    {
        "username": "amit_shah_283",
        "name": "Amit shah",
        "phone": "78213138121",
        "email": "amitshah@gmail.com",
        "role": "GUEST",
        "guest_type": "STAY_IN"
    },
    {
        "username": "jay_doe_871",
        "name": "jay doe",
        "phone": "87274728224",
        "email": "jaydoe@gmail.com",
        "role": "GUEST",
        "guest_type": "BOTH"
    },
    {
        "username": "guest_test",
        "name": "Garry Guest",
        "phone": "6903094234",
        "email": "guest@hotel.com",
        "role": "GUEST",
        "guest_type": "BOTH"
    },
    {
        "username": "rajeev_chouhan_853",
        "name": "Rajeev chouhan",
        "phone": "7020651871",
        "email": "crajeev351@gmail.com",
        "role": "GUEST",
        "guest_type": "STAY_IN"
    },
    {
        "username": "rakesh_426",
        "name": "Rakesh",
        "phone": "12048102323",
        "email": "rakesh_426@smarthotel.com",
        "role": "GUEST",
        "guest_type": "DINE_IN"
    }
]

for cust in customers_data:
    user, created = CustomUser.objects.get_or_create(
        username=cust["username"],
        defaults={
            "name": cust["name"],
            "phone": cust["phone"],
            "email": cust["email"],
            "role": cust["role"],
            "guest_type": cust.get("guest_type", "BOTH")
        }
    )
    if created:
        user.set_password("Guest123!")
        user.save()
        print(f"Created customer: {cust['name']} ({cust['username']})")

print(f"Customer database seeded! Total guest customers: {CustomUser.objects.filter(role='GUEST').count()}")
