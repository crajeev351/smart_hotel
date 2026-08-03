import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from menu.models import MenuCategory, MenuItem

categories_data = [
    {"name": "drinks", "display_order": 1, "description": "Refreshing hot & cold beverages"},
    {"name": "snacks", "display_order": 2, "description": "Quick bites & evening snacks"},
    {"name": "main course", "display_order": 3, "description": "Delicious & hearty meals"},
    {"name": "dessert", "display_order": 4, "description": "Sweet treats & desserts"},
]

category_objs = {}
for cat in categories_data:
    obj, created = MenuCategory.objects.get_or_create(
        name=cat["name"],
        defaults={
            "display_order": cat["display_order"],
            "description": cat["description"],
            "is_active": True
        }
    )
    category_objs[cat["name"]] = obj
    if created:
        print(f"Created category: {cat['name']}")

items_data = [
    {
        "name": "veg burger",
        "category": "snacks",
        "price": 500.00,
        "is_veg": True,
        "prep_time": 15,
        "image": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80"
    },
    {
        "name": "burger",
        "category": "snacks",
        "price": 500.00,
        "is_veg": True,
        "prep_time": 15,
        "image": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80"
    },
    {
        "name": "fries",
        "category": "snacks",
        "price": 100.00,
        "is_veg": True,
        "prep_time": 10,
        "image": "https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=600&q=80"
    },
    {
        "name": "pinacolada",
        "category": "drinks",
        "price": 80.00,
        "is_veg": True,
        "prep_time": 10,
        "image": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80"
    },
    {
        "name": "gulab jamun",
        "category": "dessert",
        "price": 200.00,
        "is_veg": True,
        "prep_time": 10,
        "image": "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80"
    },
    {
        "name": "Butter Paneer & Naan",
        "category": "main course",
        "price": 350.00,
        "is_veg": True,
        "prep_time": 20,
        "image": "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80"
    },
    {
        "name": "Cold Coffee",
        "category": "drinks",
        "price": 120.00,
        "is_veg": True,
        "prep_time": 5,
        "image": "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80"
    },
    {
        "name": "Chocolate Lava Cake",
        "category": "dessert",
        "price": 250.00,
        "is_veg": True,
        "prep_time": 15,
        "image": "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80"
    },
]

for item in items_data:
    cat_obj = category_objs.get(item["category"])
    if cat_obj:
        m_item, created = MenuItem.objects.get_or_create(
            name=item["name"],
            category=cat_obj,
            defaults={
                "price": item["price"],
                "is_veg": item["is_veg"],
                "is_available": True,
                "prep_time": item["prep_time"],
                "image": item["image"]
            }
        )
        if created:
            print(f"Created menu item: {item['name']}")
        else:
            # If item image is empty, populate default image
            if not m_item.image:
                m_item.image = item["image"]
                m_item.save()

print(f"Menu database seeded! Total categories: {MenuCategory.objects.count()}, Total items: {MenuItem.objects.count()}")
