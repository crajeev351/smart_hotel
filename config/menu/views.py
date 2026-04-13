from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db.models import Count

from .models import MenuCategory, MenuItem
from .serializers import MenuCategorySerializer, MenuItemSerializer

from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend

from rooms.models import Room
from accounts.models import CustomUser


# =========================
# API VIEWSETS
# =========================

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


# =========================
# FRONTEND VIEWS
# =========================

@login_required
def category_page(request):
    if request.method == 'POST':

        # 🔥 DELETE CATEGORY
        if request.POST.get('delete_id'):
            cat_id = request.POST.get('delete_id')
            try:
                category = MenuCategory.objects.get(id=cat_id)
                category.delete()
            except MenuCategory.DoesNotExist:
                pass
            return redirect('categories')

        # 🔥 CREATE CATEGORY
        name = request.POST.get('name')
        display_order = request.POST.get('display_order')
        description = request.POST.get('description')

        if name:  # ✅ Prevent NULL error
            MenuCategory.objects.create(
                name=name,
                display_order=display_order,
                description=description
            )

        return redirect('categories')

    categories = MenuCategory.objects.filter(is_active=True).order_by('display_order')
    return render(request, 'categories.html', {'categories': categories})


@login_required
def menu_items_page(request):
    if request.method == 'POST':

        # 🔥 DELETE ITEM
        if request.POST.get('delete_id'):
            item_id = request.POST.get('delete_id')
            try:
                item = MenuItem.objects.get(id=item_id)
                item.delete()
            except MenuItem.DoesNotExist:
                pass
            return redirect('menu_items')

        # 🔥 CREATE ITEM
        name = request.POST.get('name')
        price = request.POST.get('price')
        category_id = request.POST.get('category')
        is_veg = request.POST.get('is_veg') == 'on'
        image_url = request.POST.get('image_url')

        if name and category_id:
            category = MenuCategory.objects.get(id=category_id)

            MenuItem.objects.create(
                name=name,
                price=price,
                category=category,
                is_veg=is_veg,
                image_url=image_url,
            )

        return redirect('menu_items')

    categories = MenuCategory.objects.filter(is_active=True)
    items = MenuItem.objects.filter(is_available=True)

    return render(request, 'menu_items.html', {
        'categories': categories,
        'items': items
    })

@login_required
def reports_dashboard(request):
    return render(request, 'reports.html')


# =========================
# MODULE 5 - REPORT APIs
# =========================

@api_view(['GET'])
def menu_count(request):
    return Response({
        "total_menu_items": MenuItem.objects.count()
    })


@api_view(['GET'])
def room_count(request):
    return Response({
        "total_rooms": Room.objects.count()
    })


@api_view(['GET'])
def users_by_role(request):
    data = CustomUser.objects.values('role').annotate(count=Count('id'))
    return Response(data)
