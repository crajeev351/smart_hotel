from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from menu.views import MenuCategoryViewSet, MenuItemViewSet
from accounts.views import login_page, logout_page
from menu.views import menu_count, room_count, users_by_role
from menu.views import reports_dashboard
# API router
router = DefaultRouter()
router.register(r'categories', MenuCategoryViewSet)
router.register(r'menu-items', MenuItemViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),

    # ✅ FRONTEND
    path('', include('menu.urls')),
    path('', include('rooms.urls')),
    

    # ✅ API
    path('api/', include(router.urls)),
    # Login / Logout
    path('login/', login_page, name='login'),
    path('logout/', logout_page, name='logout'),
    path('api/', include('accounts.urls')),
    path('api/reports/menu-count/', menu_count),
    path('api/reports/room-count/', room_count),
    path('api/reports/users-by-role/', users_by_role),
    path('reports/', reports_dashboard, name='reports'),
]