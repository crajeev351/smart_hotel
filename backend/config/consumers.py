import json
from channels.generic.websocket import AsyncWebsocketConsumer

class UpdateConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # We'll use a single global group for all general updates (rooms, orders, etc.)
        self.group_name = 'global_updates'

        # Join global group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave group
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    # Receive message from room group
    async def global_update(self, event):
        message = event['message']
        model = event.get('model', 'Unknown')
        action = event.get('action', 'update')

        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'message': message,
            'model': model,
            'action': action
        }))
