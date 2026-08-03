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
        "image": "/menu_images/burger.png"
    },
    {
        "name": "burger",
        "category": "snacks",
        "price": 500.00,
        "is_veg": True,
        "prep_time": 15,
        "image": "/menu_images/burger.png"
    },
    {
        "name": "fries",
        "category": "snacks",
        "price": 100.00,
        "is_veg": True,
        "prep_time": 10,
        "image": "/menu_images/fries.png"
    },
    {
        "name": "pinacolada",
        "category": "drinks",
        "price": 80.00,
        "is_veg": True,
        "prep_time": 10,
        "image": "/menu_images/pinacolada.png"
    },
    {
        "name": "gulab jamun",
        "category": "dessert",
        "price": 200.00,
        "is_veg": True,
        "prep_time": 10,
        "image": "/menu_images/gulab_jamun.png"
    },
    {
        "name": "Butter Paneer & Naan",
        "category": "main course",
        "price": 350.00,
        "is_veg": True,
        "prep_time": 20,
        "image": "/menu_images/butter_paneer.png"
    },
    {
        "name": "Cold Coffee",
        "category": "drinks",
        "price": 120.00,
        "is_veg": True,
        "prep_time": 5,
        "image": "/menu_images/cold_coffee.png"
    },
    {
        "name": "Chocolate Lava Cake",
        "category": "dessert",
        "price": 250.00,
        "is_veg": True,
        "prep_time": 15,
        "image": "/menu_images/lava_cake.png"
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
            img_str = str(m_item.image or '')
            if not img_str or not img_str.startswith('/menu_images/'):
                m_item.image = item["image"]
                m_item.save()
                print(f"Updated image path to local static folder for menu item: {item['name']}")

print(f"Menu database seeded! Total categories: {MenuCategory.objects.count()}, Total items: {MenuItem.objects.count()}")
