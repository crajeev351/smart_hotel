from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MenuCategoryViewSet, MenuItemViewSet
from .views import category_page
from .views import menu_items_page

router = DefaultRouter()
router.register(r'categories', MenuCategoryViewSet)
router.register(r'menu-items', MenuItemViewSet)

urlpatterns = [
    
    path('categories/', category_page, name='categories'),
    path('menu-items/', menu_items_page, name='menu_items'),
    
]