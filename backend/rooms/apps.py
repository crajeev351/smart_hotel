from django.apps import AppConfig


class RoomsConfig(AppConfig):
    name = 'rooms'

    def ready(self):
        try:
            from .sync import start_sync_thread
            start_sync_thread()
        except Exception:
            pass
