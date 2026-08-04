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


class WritableImageField(serializers.ImageField):
    def to_representation(self, value):
        if not value:
            return None
        img_str = str(value)
        if img_str.startswith('http://') or img_str.startswith('https://') or img_str.startswith('/menu_images/'):
            return img_str
        request = self.context.get('request')
        try:
            if request is not None:
                return request.build_absolute_uri(value.url)
            return value.url
        except Exception:
            return img_str


class MenuItemSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    image = WritableImageField(required=False, allow_null=True)

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