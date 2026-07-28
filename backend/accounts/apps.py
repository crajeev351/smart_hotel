from django.apps import AppConfig
from django.db.models.signals import post_migrate

def seed_default_users(sender, **kwargs):
    try:
        from accounts.models import CustomUser
        users = [
            {"username": "Rajeev7112", "email": "rajeev7112@smarthotel.com", "name": "Rajeev (Admin)", "phone": "+1234567890", "role": "ADMIN", "password": "Rajeev123!", "is_staff": True, "is_superuser": True},
            {"username": "reception_test", "email": "reception@smarthotel.com", "name": "Reception Desk Staff", "phone": "+1234567891", "role": "RECEPTION", "password": "Password123!", "is_staff": False, "is_superuser": False},
            {"username": "waiter_test", "email": "waiter@smarthotel.com", "name": "Floor Waiter Staff", "phone": "+1234567892", "role": "WAITER", "password": "Password123!", "is_staff": False, "is_superuser": False},
            {"username": "kitchen_test", "email": "kitchen@smarthotel.com", "name": "Kitchen Display Staff", "phone": "+1234567893", "role": "KITCHEN", "password": "Password123!", "is_staff": False, "is_superuser": False},
            {"username": "janitor_test", "email": "janitor@smarthotel.com", "name": "Cleaning Janitor Staff", "phone": "+1234567894", "role": "JANITOR", "password": "Password123!", "is_staff": False, "is_superuser": False}
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
            if created or not user.check_password(u["password"]):
                user.set_password(u["password"])
                user.role = u["role"]
                user.save()
    except Exception as e:
        print(f"Auto-seed notification: {e}")

class AccountsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'accounts'

    def ready(self):
        post_migrate.connect(seed_default_users, sender=self)
