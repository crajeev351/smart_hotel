from django.urls import path
from .views import rooms_page




urlpatterns = [
    path('rooms/', rooms_page, name='rooms'),
]