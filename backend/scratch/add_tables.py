import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from orders.models import Table

new_tables = [
    # Cap 2
    ('111', 2), ('112', 2), ('113', 2), ('114', 2),
    ('115', 2), ('116', 2), ('117', 2), ('118', 2),
    ('119', 2), ('120', 2),
    # Cap 4
    ('211', 4), ('212', 4), ('213', 4), ('214', 4),
    ('215', 4), ('216', 4), ('217', 4), ('218', 4),
    ('219', 4), ('220', 4),
    # Cap 6
    ('306', 6), ('307', 6), ('308', 6), ('309', 6), ('310', 6)
]

for t_num, cap in new_tables:
    Table.objects.get_or_create(table_number=t_num, defaults={'capacity': cap})

print("Tables added. Total tables:", Table.objects.count())
