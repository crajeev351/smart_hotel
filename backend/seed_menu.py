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
        "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Cheeseburger.jpg/600px-Cheeseburger.jpg"
    },
    {
        "name": "burger",
        "category": "snacks",
        "price": 500.00,
        "is_veg": True,
        "prep_time": 15,
        "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Cheeseburger.jpg/600px-Cheeseburger.jpg"
    },
    {
        "name": "fries",
        "category": "snacks",
        "price": 100.00,
        "is_veg": True,
        "prep_time": 10,
        "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/French_fries_in_bowl.jpg/600px-French_fries_in_bowl.jpg"
    },
    {
        "name": "pinacolada",
        "category": "drinks",
        "price": 80.00,
        "is_veg": True,
        "prep_time": 10,
        "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Pina_Colada.jpg/600px-Pina_Colada.jpg"
    },
    {
        "name": "gulab jamun",
        "category": "dessert",
        "price": 200.00,
        "is_veg": True,
        "prep_time": 10,
        "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Gulab_jamun_2.jpg/600px-Gulab_jamun_2.jpg"
    },
    {
        "name": "Butter Paneer & Naan",
        "category": "main course",
        "price": 350.00,
        "is_veg": True,
        "prep_time": 20,
        "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Shahi_Paneer_Elante.jpg/600px-Shahi_Paneer_Elante.jpg"
    },
    {
        "name": "Cold Coffee",
        "category": "drinks",
        "price": 120.00,
        "is_veg": True,
        "prep_time": 5,
        "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/A_small_cup_of_coffee.jpg/600px-A_small_cup_of_coffee.jpg"
    },
    {
        "name": "Chocolate Lava Cake",
        "category": "dessert",
        "price": 250.00,
        "is_veg": True,
        "prep_time": 15,
        "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Chocolate_lavas_cake.jpg/600px-Chocolate_lavas_cake.jpg"
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
            if not img_str or img_str.startswith('/media/') or img_str.startswith('menu_images/') or 'unsplash.com' in img_str:
                m_item.image = item["image"]
                m_item.save()
                print(f"Updated image URL to Wikimedia for menu item: {item['name']}")

print(f"Menu database seeded! Total categories: {MenuCategory.objects.count()}, Total items: {MenuItem.objects.count()}")
