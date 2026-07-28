import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from orders.models import Table

# Clear existing tables
Table.objects.all().delete()

tables_to_create = []

# 10 tables of 2 (101-110)
for num in range(1, 11):
    table_number = f"10{num}" if num < 10 else "110"
    tables_to_create.append(Table(
        table_number=table_number,
        capacity=2,
        status='VACANT'
    ))

# 10 tables of 4 (201-210)
for num in range(1, 11):
    table_number = f"20{num}" if num < 10 else "210"
    tables_to_create.append(Table(
        table_number=table_number,
        capacity=4,
        status='VACANT'
    ))

# 5 tables of 6 (301-305)
for num in range(1, 6):
    table_number = f"30{num}"
    tables_to_create.append(Table(
        table_number=table_number,
        capacity=6,
        status='VACANT'
    ))

Table.objects.bulk_create(tables_to_create)
print(f"Successfully seeded {Table.objects.count()} tables in database.")
