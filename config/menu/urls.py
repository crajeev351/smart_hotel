from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MenuCategoryViewSet, MenuItemViewSet

router = DefaultRouter()
router.register(r'categories', MenuCategoryViewSet)
router.register(r'menu-items', MenuItemViewSet)

urlpatterns = [
    path('', include(router.urls)),
]