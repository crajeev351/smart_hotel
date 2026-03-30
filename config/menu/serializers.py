from rest_framework import serializers
from .models import MenuCategory, MenuItem


class MenuCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = MenuCategory
        fields = '__all__'

    def validate_display_order(self, value):
        if value < 0:
            raise serializers.ValidationError("Display order must be >= 0")
        return value


class MenuItemSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = MenuItem
        fields = '__all__'

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than 0")
        return value

    def validate_category(self, value):
        if not value.is_active:
            raise serializers.ValidationError("Category must be active")
        return value