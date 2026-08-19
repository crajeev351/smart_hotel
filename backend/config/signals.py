from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from rooms.models import Room, Booking
from orders.models import Table, TableReservation, Order, OrderItem, Invoice

def broadcast_update(model_name, action):
    channel_layer = get_channel_layer()
    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            'global_updates',
            {
                'type': 'global_update',
                'message': f'{model_name} {action}',
                'model': model_name,
                'action': action
            }
        )

def trigger_sync():
    import os
    # Only trigger sync event if we are running locally (not on Render)
    if not os.environ.get('POSTGRES_DB'):
        try:
            from rooms.sync import sync_event
            sync_event.set()
        except Exception as e:
            print(f"Failed to trigger sync event: {e}")

# A generic receiver factory
def create_receivers(model_cls):
    @receiver(post_save, sender=model_cls, weak=False)
    def on_save(sender, instance, created, **kwargs):
        broadcast_update(sender.__name__, 'created' if created else 'updated')
        trigger_sync()

    @receiver(post_delete, sender=model_cls, weak=False)
    def on_delete(sender, instance, **kwargs):
        broadcast_update(sender.__name__, 'deleted')
        trigger_sync()

# Connect models
create_receivers(Room)
create_receivers(Booking)
create_receivers(Table)
create_receivers(TableReservation)
create_receivers(Order)
create_receivers(OrderItem)
create_receivers(Invoice)
