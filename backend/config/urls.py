from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from menu.views import (
    MenuCategoryViewSet, 
    MenuItemViewSet, 
    menu_count, 
    room_count, 
    users_by_role, 
    analytics_report,
    reports_dashboard,
    wipe_finances
)
from rooms.views import RoomViewSet, BookingViewSet
from orders.views import TableViewSet, TableReservationViewSet, OrderViewSet, OrderItemViewSet, InvoiceViewSet
from accounts.views import login_page, logout_page, CustomTokenObtainPairView
from django.conf import settings
from django.conf.urls.static import static

# API router
router = DefaultRouter()
router.register(r'categories', MenuCategoryViewSet)
router.register(r'menu-items', MenuItemViewSet)
router.register(r'rooms', RoomViewSet)
router.register(r'bookings', BookingViewSet)
router.register(r'tables', TableViewSet)
router.register(r'table-reservations', TableReservationViewSet)
router.register(r'orders', OrderViewSet)
router.register(r'order-items', OrderItemViewSet)
router.register(r'invoices', InvoiceViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),

    # JWT Authentication
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # API
    path('api/', include(router.urls)),
    # Login / Logout
    path('login/', login_page, name='login'),
    path('logout/', logout_page, name='logout'),
    path('api/', include('accounts.urls')),
    path('api/reports/menu-count/', menu_count),
    path('api/reports/room-count/', room_count),
    path('api/reports/users-by-role/', users_by_role),
    path('api/reports/analytics/', analytics_report),
    path('api/reports/wipe-finances/', wipe_finances),
    path('reports/', reports_dashboard, name='reports'),
    path('', include('menu.urls')),
    path('', include('rooms.urls')),
]

from django.views.static import serve
from django.urls import re_path

urlpatterns += [
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]

import config.signals
