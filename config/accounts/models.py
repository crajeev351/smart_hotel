from django.contrib.auth.models import AbstractUser
from django.db import models
import uuid


class CustomUser(AbstractUser):
    # UUID as primary key (as per PDF)
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Full name (separate from username)
    name = models.CharField(max_length=100)

    # Unique email
    email = models.EmailField(unique=True)

    # Phone number
    phone = models.CharField(max_length=15)

    # Role choices (ENUM)
    ROLE_CHOICES = [
        ('ADMIN', 'Admin'),
        ('RECEPTION', 'Reception'),
        ('KITCHEN', 'Kitchen'),
        ('WAITER', 'Waiter'),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES)

    # Active / deactivate user
    is_active = models.BooleanField(default=True)

    # Timestamp
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.username