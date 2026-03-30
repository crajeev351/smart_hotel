from django.shortcuts import render

# Create your views here.
from .models import MenuCategory, MenuItem
from .serializers import MenuCategorySerializer, MenuItemSerializer
from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters

class MenuCategoryViewSet(viewsets.ModelViewSet):
    queryset = MenuCategory.objects.filter(is_active=True).order_by('display_order')
    serializer_class = MenuCategorySerializer

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()
class MenuItemViewSet(viewsets.ModelViewSet):
    queryset = MenuItem.objects.filter(is_available=True)
    serializer_class = MenuItemSerializer

    filter_backends = [DjangoFilterBackend, filters.SearchFilter]


    filterset_fields = ['category', 'is_veg']

    
    search_fields = ['name']