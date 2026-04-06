from django.db import models

# Create your models here.

class Room(models.Model):

    ROOM_TYPE_CHOICES = [
        ('SINGLE', 'Single'),
        ('DOUBLE', 'Double'),
        ('DELUXE', 'Deluxe'),
    ]

    STATUS_CHOICES = [
        ('AVAILABLE', 'Available'),
        ('OCCUPIED', 'Occupied'),
        ('MAINTENANCE', 'Maintenance'),
    ]

    room_number = models.CharField(max_length=10, unique=True)
    room_type = models.CharField(max_length=10, choices=ROOM_TYPE_CHOICES)
    price_per_night = models.DecimalField(max_digits=10, decimal_places=2)
    capacity = models.IntegerField()
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='AVAILABLE')
    floor = models.IntegerField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.room_number