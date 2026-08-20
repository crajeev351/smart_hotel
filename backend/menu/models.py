from django.db import models

# Create your models here.

class MenuCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    display_order = models.IntegerField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
class MenuItem(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.ForeignKey(MenuCategory, on_delete=models.CASCADE)
    is_veg = models.BooleanField(default=True)
    is_available = models.BooleanField(default=True)
    image = models.ImageField(upload_to='menu_images/', blank=True, null=True)
    prep_time = models.IntegerField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

# Propagate deletions to cloud
from django.db.models.signals import post_delete
from django.dispatch import receiver
import os
import threading

@receiver(post_delete, sender=MenuItem)
def propagate_menu_item_deletion(sender, instance, **kwargs):
    if not os.environ.get('POSTGRES_DB'):
        try:
            from rooms.sync import propagate_delete_to_cloud, register_deleted_menu_item
            register_deleted_menu_item(instance.name)
            threading.Thread(target=propagate_delete_to_cloud, args=(instance.name,), daemon=True).start()
        except Exception as e:
            print(f"Error in propagate_menu_item_deletion signal: {e}")