from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import permissions
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

        if name:
            MenuCategory.objects.create(
                name=name,
                display_order=display_order,
                description=description,
            )

        return redirect('categories')

    categories = MenuCategory.objects.filter(is_active=True).order_by('display_order')
    return render(request, 'categories.html', {'categories': categories})


@login_required
def menu_items_page(request):
    if request.method == 'POST':

        # 🔥 UPDATE ITEM PRICE
        update_id = request.POST.get('update_id')
        new_price = request.POST.get('new_price')
        if update_id and new_price:
            try:
                item = MenuItem.objects.get(id=update_id)
                item.price = new_price
                item.save()
            except MenuItem.DoesNotExist:
                pass
            return redirect('menu_items')

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
        is_veg = request.POST.get('is_veg') == 'veg'
        image = request.FILES.get('image')

        if name and category_id:
            category = MenuCategory.objects.get(id=category_id)
            MenuItem.objects.create(
                name=name,
                price=price,
                category=category,
                is_veg=is_veg,
                image=image,
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

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def wipe_finances(request):
    try:
        from orders.models import Order, OrderItem, Invoice
        OrderItem.objects.all().delete()
        Order.objects.all().delete()
        Invoice.objects.all().delete()
        return Response({'status': 'Finances wiped successfully'})
    except Exception as e:
        return Response({'error': str(e)}, status=500)

from orders.models import Table, Order, Invoice
from django.db.models import Sum, Count, Q
from django.core.cache import cache
from django.utils import timezone

@api_view(['GET'])
def analytics_report(request):
    now = timezone.now()
    today = now.date()

    try:
        selected_year = int(request.query_params.get('year', now.year))
    except (ValueError, TypeError):
        selected_year = now.year

    try:
        selected_month = int(request.query_params.get('month', now.month))
    except (ValueError, TypeError):
        selected_month = now.month

    cache_key = f"analytics_report_{today}_{selected_year}_{selected_month}"
    cached_data = cache.get(cache_key)
    if cached_data is not None:
        return Response(cached_data)

    # Consolidated Room Aggregations (1 query)
    room_agg = Room.objects.aggregate(
        total=Count('id'),
        occupied=Count('id', filter=Q(status='OCCUPIED')),
        maintenance=Count('id', filter=Q(status='MAINTENANCE'))
    )
    total_rooms = room_agg['total'] or 0
    occupied_rooms = room_agg['occupied'] or 0
    maintenance_rooms = room_agg['maintenance'] or 0

    # Consolidated Table Aggregations (1 query)
    table_agg = Table.objects.aggregate(
        total=Count('id'),
        occupied=Count('id', filter=Q(status='OCCUPIED')),
        cleaning=Count('id', filter=Q(status='UNDER_CLEANING'))
    )
    total_tables = table_agg['total'] or 0
    occupied_tables = table_agg['occupied'] or 0
    cleaning_tables = table_agg['cleaning'] or 0

    # Consolidated Revenue Aggregations (1 query)
    invoice_agg = Invoice.objects.filter(payment_status='PAID').aggregate(
        daily=Sum('total_amount', filter=Q(created_at__date=today)),
        monthly=Sum('total_amount', filter=Q(created_at__year=selected_year, created_at__month=selected_month)),
        yearly=Sum('total_amount', filter=Q(created_at__year=selected_year)),
        total=Sum('total_amount')
    )
    daily_revenue = float(invoice_agg['daily'] or 0.0)
    monthly_revenue = float(invoice_agg['monthly'] or 0.0)
    yearly_revenue = float(invoice_agg['yearly'] or 0.0)
    total_revenue = float(invoice_agg['total'] or 0.0)

    total_orders = Order.objects.count()
    total_bookings = occupied_rooms
    occupancy_rate = round((occupied_rooms / total_rooms * 100) if total_rooms > 0 else 0.0, 2)
    roles_data = list(CustomUser.objects.values('role').annotate(count=Count('id')))

    data = {
        "total_rooms": total_rooms,
        "occupied_rooms": occupied_rooms,
        "maintenance_rooms": maintenance_rooms,
        "total_tables": total_tables,
        "occupied_tables": occupied_tables,
        "cleaning_tables": cleaning_tables,
        "daily_revenue": daily_revenue,
        "monthly_revenue": monthly_revenue,
        "yearly_revenue": yearly_revenue,
        "total_revenue": total_revenue,
        "total_orders": total_orders,
        "total_bookings": total_bookings,
        "occupancy_rate": occupancy_rate,
        "users_by_role": roles_data
    }
    cache.set(cache_key, data, timeout=5)
    return Response(data)