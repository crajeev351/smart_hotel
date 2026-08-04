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

# Clear existing menu items first for a clean slate
print("Clearing existing menu items...")
MenuItem.objects.all().delete()

items_data = [
    {
        "name": "veg burger",
        "category": "snacks",
        "price": 180.00,
        "is_veg": True,
        "prep_time": 15,
        "image": "/menu_images/burger.png"
    },
    {
        "name": "burger",
        "category": "snacks",
        "price": 220.00,
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
        "price": 140.00,
        "is_veg": True,
        "prep_time": 10,
        "image": "/menu_images/pinacolada.png"
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
        "name": "Fresh Lime Soda",
        "category": "drinks",
        "price": 80.00,
        "is_veg": True,
        "prep_time": 5,
        "image": "/menu_images/lime_soda.png"
    },
    {
        "name": "gulab jamun",
        "category": "dessert",
        "price": 90.00,
        "is_veg": True,
        "prep_time": 10,
        "image": "/menu_images/gulab_jamun.png"
    },
    {
        "name": "Chocolate Lava Cake",
        "category": "dessert",
        "price": 160.00,
        "is_veg": True,
        "prep_time": 15,
        "image": "/menu_images/lava_cake.png"
    },
    {
        "name": "Mango Kulfi",
        "category": "dessert",
        "price": 110.00,
        "is_veg": True,
        "prep_time": 5,
        "image": "/menu_images/mango_kulfi.png"
    },
    {
        "name": "Butter Paneer & Naan",
        "category": "main course",
        "price": 320.00,
        "is_veg": True,
        "prep_time": 20,
        "image": "/menu_images/butter_paneer.png"
    },
    {
        "name": "Dal Makhani & Roti",
        "category": "main course",
        "price": 260.00,
        "is_veg": True,
        "prep_time": 15,
        "image": "/menu_images/dal_makhani.png"
    },
    {
        "name": "Veg Biryani",
        "category": "main course",
        "price": 280.00,
        "is_veg": True,
        "prep_time": 20,
        "image": "/menu_images/veg_biryani.png"
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
            m_item.price = item["price"]
            m_item.is_veg = item["is_veg"]
            m_item.prep_time = item["prep_time"]
            m_item.image = item["image"]
            m_item.save()
            print(f"Updated menu item: {item['name']}")

print(f"Menu database seeded! Total categories: {MenuCategory.objects.count()}, Total items: {MenuItem.objects.count()}")
