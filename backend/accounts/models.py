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
        ('GUEST', 'Guest'),
        ('JANITOR', 'Janitor'),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES)

    # Guest Type (Module 1)
    GUEST_TYPE_CHOICES = [
        ('DINE_IN', 'Dine-in Only'),
        ('STAY_IN', 'Stay-in Only'),
        ('BOTH', 'Stay + Dine-in'),
    ]
    guest_type = models.CharField(max_length=20, choices=GUEST_TYPE_CHOICES, blank=True, null=True)

    # Active / deactivate user
    is_active = models.BooleanField(default=True)

    # OTP for second factor guest verification
    otp_code = models.CharField(max_length=6, blank=True, null=True)
    otp_created_at = models.DateTimeField(blank=True, null=True)

    # Timestamp
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.username


class OTPVerification(models.Model):
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_verified = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.email} - {self.code} - {self.is_verified}"