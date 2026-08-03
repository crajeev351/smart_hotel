import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from orders.models import Table

created_count = 0

# 10 tables of 2 (101-110)
for num in range(1, 11):
    table_number = f"10{num}" if num < 10 else "110"
    _, created = Table.objects.get_or_create(
        table_number=table_number,
        defaults={'capacity': 2, 'status': 'VACANT'}
    )
    if created:
        created_count += 1

# 10 tables of 4 (201-210)
for num in range(1, 11):
    table_number = f"20{num}" if num < 10 else "210"
    _, created = Table.objects.get_or_create(
        table_number=table_number,
        defaults={'capacity': 4, 'status': 'VACANT'}
    )
    if created:
        created_count += 1

# 5 tables of 6 (301-305)
for num in range(1, 6):
    table_number = f"30{num}"
    _, created = Table.objects.get_or_create(
        table_number=table_number,
        defaults={'capacity': 6, 'status': 'VACANT'}
    )
    if created:
        created_count += 1

print(f"Tables check complete. New tables created: {created_count}. Total tables: {Table.objects.count()}.")
