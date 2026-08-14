import os
import time
import datetime
import threading
import requests
from django.utils.dateparse import parse_datetime

CLOUD_URL = "https://smart-hotel-mchq.onrender.com"

def get_cloud_token():
    url = f"{CLOUD_URL}/api/token/"
    try:
        response = requests.post(url, json={
            "username": "Rajeev7112",
            "password": "Rajeev123!"
        }, timeout=10)
        if response.status_code == 200:
            return response.json().get("access")
        else:
            print(f"[Sync] Login failed with status code {response.status_code}: {response.text}")
    except Exception as e:
        print(f"[Sync] Login exception: {e}")
    return None

def fetch_cloud_data(token):
    headers = {"Authorization": f"Bearer {token}"}
    try:
        users = requests.get(f"{CLOUD_URL}/api/users/", headers=headers, timeout=10).json()
        rooms = requests.get(f"{CLOUD_URL}/api/rooms/", headers=headers, timeout=10).json()
        bookings = requests.get(f"{CLOUD_URL}/api/bookings/", headers=headers, timeout=10).json()
        tables = requests.get(f"{CLOUD_URL}/api/tables/", headers=headers, timeout=10).json()
        reservations = requests.get(f"{CLOUD_URL}/api/table-reservations/", headers=headers, timeout=10).json()
        orders = requests.get(f"{CLOUD_URL}/api/orders/", headers=headers, timeout=10).json()
        invoices = requests.get(f"{CLOUD_URL}/api/invoices/", headers=headers, timeout=10).json()
        return users, rooms, bookings, tables, reservations, orders, invoices
    except Exception as e:
        print(f"[Sync] Failed to fetch cloud data: {e}")
        return None, None, None, None, None, None, None

def sync_data():
    from accounts.models import CustomUser
    from rooms.models import Room, Booking
    from orders.models import Table, TableReservation, Order, OrderItem, Invoice
    from menu.models import MenuItem

    token = get_cloud_token()
    if not token:
        return

    c_data = fetch_cloud_data(token)
    c_users, c_rooms, c_bookings, c_tables, c_reservations, c_orders, c_invoices = c_data
    if any(item is None for item in c_data):
        return

    headers = {"Authorization": f"Bearer {token}"}

    # 1. Sync Users
    local_users = {user.username: user for user in CustomUser.objects.all()}
    cloud_users_by_username = {u['username']: u for u in c_users}

    # Local -> Cloud
    for username, l_user in local_users.items():
        if username not in cloud_users_by_username:
            try:
                payload = {
                    "username": l_user.username,
                    "email": l_user.email,
                    "name": l_user.name,
                    "phone": l_user.phone,
                    "role": l_user.role,
                    "guest_type": l_user.guest_type,
                    "is_active": l_user.is_active,
                    "password": "Rajeev123!"
                }
                res = requests.post(f"{CLOUD_URL}/api/users/", headers=headers, json=payload, timeout=10)
                if res.status_code in [200, 201]:
                    cloud_users_by_username[username] = res.json()
                    print(f"[Sync] Created user {username} on cloud.")
                else:
                    print(f"[Sync] Failed to create user {username} on cloud: {res.text}")
            except Exception as e:
                print(f"[Sync] Error creating user {username} on cloud: {e}")

    # Cloud -> Local
    for username, c_user in cloud_users_by_username.items():
        if username not in local_users:
            try:
                l_user = CustomUser(
                    id=c_user['id'],
                    username=c_user['username'],
                    email=c_user['email'],
                    name=c_user['name'],
                    phone=c_user['phone'],
                    role=c_user['role'],
                    guest_type=c_user.get('guest_type'),
                    is_active=c_user.get('is_active', True)
                )
                l_user.set_password("Rajeev123!")
                l_user.save()
                local_users[username] = l_user
                print(f"[Sync] Created user {username} locally.")
            except Exception as e:
                print(f"[Sync] Error creating user {username} locally: {e}")

    # 2. Sync Rooms
    local_rooms = {room.room_number: room for room in Room.objects.all()}
    cloud_rooms_by_number = {r['room_number']: r for r in c_rooms}

    # Local -> Cloud
    for r_num, l_room in local_rooms.items():
        if r_num not in cloud_rooms_by_number:
            try:
                payload = {
                    "room_number": l_room.room_number,
                    "room_type": l_room.room_type,
                    "price_per_night": str(l_room.price_per_night),
                    "capacity": l_room.capacity,
                    "status": l_room.status,
                    "floor": l_room.floor
                }
                res = requests.post(f"{CLOUD_URL}/api/rooms/", headers=headers, json=payload, timeout=10)
                if res.status_code in [200, 201]:
                    cloud_rooms_by_number[r_num] = res.json()
                    print(f"[Sync] Created room {r_num} on cloud.")
                else:
                    print(f"[Sync] Failed to create room {r_num} on cloud: {res.text}")
            except Exception as e:
                print(f"[Sync] Error creating room {r_num} on cloud: {e}")
        else:
            c_room = cloud_rooms_by_number[r_num]
            l_updated = l_room.updated_at
            c_updated = parse_datetime(c_room['updated_at'])
            
            if l_updated and c_updated:
                if l_updated.tzinfo is None:
                    l_updated = l_updated.replace(tzinfo=datetime.timezone.utc)
                if c_updated.tzinfo is None:
                    c_updated = c_updated.replace(tzinfo=datetime.timezone.utc)
                
                if l_room.status != c_room['status']:
                    if l_updated > c_updated:
                        try:
                            res = requests.patch(f"{CLOUD_URL}/api/rooms/{c_room['id']}/", headers=headers, json={"status": l_room.status}, timeout=10)
                            if res.status_code == 200:
                                print(f"[Sync] Updated room {r_num} status on cloud to {l_room.status}.")
                        except Exception as e:
                            print(f"[Sync] Error updating room {r_num} on cloud: {e}")
                    else:
                        Room.objects.filter(id=l_room.id).update(status=c_room['status'], updated_at=c_updated)
                        print(f"[Sync] Updated room {r_num} status locally to {c_room['status']}.")

    # Cloud -> Local
    for r_num, c_room in cloud_rooms_by_number.items():
        if r_num not in local_rooms:
            try:
                l_room = Room.objects.create(
                    room_number=c_room['room_number'],
                    room_type=c_room['room_type'],
                    price_per_night=c_room['price_per_night'],
                    capacity=c_room['capacity'],
                    status=c_room['status'],
                    floor=c_room['floor']
                )
                c_updated = parse_datetime(c_room['updated_at'])
                if c_updated:
                    Room.objects.filter(id=l_room.id).update(updated_at=c_updated)
                local_rooms[r_num] = l_room
                print(f"[Sync] Created room {r_num} locally.")
            except Exception as e:
                print(f"[Sync] Error creating room {r_num} locally: {e}")

    # 3. Sync Bookings
    local_bookings = Booking.objects.all().select_related('guest', 'room')
    local_bookings_dict = {}
    for b in local_bookings:
        key = (b.guest.username, b.room.room_number, str(b.check_in_date))
        local_bookings_dict[key] = b

    cloud_bookings_dict = {}
    for cb in c_bookings:
        key = (cb.get('guest_name'), cb.get('room_number'), cb.get('check_in_date'))
        cloud_bookings_dict[key] = cb

    # Local -> Cloud
    for key, l_booking in local_bookings_dict.items():
        if key not in cloud_bookings_dict:
            try:
                c_user = cloud_users_by_username.get(l_booking.guest.username)
                c_room = cloud_rooms_by_number.get(l_booking.room.room_number)
                if c_user and c_room:
                    payload = {
                        "guest": c_user['id'],
                        "room": c_room['id'],
                        "check_in_date": str(l_booking.check_in_date),
                        "check_out_date": str(l_booking.check_out_date),
                        "status": l_booking.status,
                        "total_price": str(l_booking.total_price),
                        "actual_check_in": l_booking.actual_check_in.isoformat() if l_booking.actual_check_in else None,
                        "actual_check_out": l_booking.actual_check_out.isoformat() if l_booking.actual_check_out else None
                    }
                    res = requests.post(f"{CLOUD_URL}/api/bookings/", headers=headers, json=payload, timeout=10)
                    if res.status_code in [200, 201]:
                        print(f"[Sync] Created booking for {key} on cloud.")
                    else:
                        print(f"[Sync] Failed to create booking for {key} on cloud: {res.text}")
            except Exception as e:
                print(f"[Sync] Error creating booking for {key} on cloud: {e}")
        else:
            c_booking = cloud_bookings_dict[key]
            c_check_in = parse_datetime(c_booking.get('actual_check_in')) if c_booking.get('actual_check_in') else None
            c_check_out = parse_datetime(c_booking.get('actual_check_out')) if c_booking.get('actual_check_out') else None
            
            status_priority = {'BOOKED': 1, 'CANCELLED': 2, 'CHECKED_IN': 3, 'CHECKED_OUT': 4}
            l_prio = status_priority.get(l_booking.status, 0)
            c_prio = status_priority.get(c_booking['status'], 0)
            
            if c_prio > l_prio:
                l_booking.status = c_booking['status']
                l_booking.actual_check_in = c_check_in
                l_booking.actual_check_out = c_check_out
                l_booking.save()
                print(f"[Sync] Updated local booking {key} status to {l_booking.status} from cloud.")
            elif l_prio > c_prio:
                try:
                    patch_payload = {
                        "status": l_booking.status,
                        "actual_check_in": l_booking.actual_check_in.isoformat() if l_booking.actual_check_in else None,
                        "actual_check_out": l_booking.actual_check_out.isoformat() if l_booking.actual_check_out else None
                    }
                    res = requests.patch(f"{CLOUD_URL}/api/bookings/{c_booking['id']}/", headers=headers, json=patch_payload, timeout=10)
                    if res.status_code == 200:
                        print(f"[Sync] Updated cloud booking {key} status to {l_booking.status} from local.")
                except Exception as e:
                    print(f"[Sync] Error updating cloud booking {key}: {e}")

    # Cloud -> Local
    for key, c_booking in cloud_bookings_dict.items():
        if key not in local_bookings_dict:
            try:
                l_user = local_users.get(key[0])
                l_room = local_rooms.get(key[1])
                if l_user and l_room:
                    Booking.objects.create(
                        guest=l_user,
                        room=l_room,
                        check_in_date=c_booking['check_in_date'],
                        check_out_date=c_booking['check_out_date'],
                        status=c_booking['status'],
                        total_price=c_booking['total_price'],
                        actual_check_in=parse_datetime(c_booking.get('actual_check_in')) if c_booking.get('actual_check_in') else None,
                        actual_check_out=parse_datetime(c_booking.get('actual_check_out')) if c_booking.get('actual_check_out') else None
                    )
                    print(f"[Sync] Created booking for {key} locally.")
            except Exception as e:
                print(f"[Sync] Error creating booking locally for {key}: {e}")

    # 4. Sync Tables
    local_tables = {t.table_number: t for t in Table.objects.all()}
    cloud_tables_by_number = {t['table_number']: t for t in c_tables}

    # Local -> Cloud
    for t_num, l_table in local_tables.items():
        if t_num not in cloud_tables_by_number:
            try:
                c_guest_id = None
                if l_table.current_guest:
                    c_guest = cloud_users_by_username.get(l_table.current_guest.username)
                    if c_guest:
                        c_guest_id = c_guest['id']
                
                payload = {
                    "table_number": l_table.table_number,
                    "capacity": l_table.capacity,
                    "status": l_table.status,
                    "current_guest": c_guest_id
                }
                res = requests.post(f"{CLOUD_URL}/api/tables/", headers=headers, json=payload, timeout=10)
                if res.status_code in [200, 201]:
                    cloud_tables_by_number[t_num] = res.json()
                    print(f"[Sync] Created table {t_num} on cloud.")
            except Exception as e:
                print(f"[Sync] Error creating table {t_num} on cloud: {e}")
        else:
            c_table = cloud_tables_by_number[t_num]
            if l_table.status != c_table['status']:
                l_guest = None
                if c_table.get('current_guest'):
                    l_guest = CustomUser.objects.filter(id=c_table.get('current_guest')).first()
                Table.objects.filter(id=l_table.id).update(status=c_table['status'], current_guest=l_guest)
                print(f"[Sync] Updated table {t_num} locally to status {c_table['status']}.")

    # Cloud -> Local
    for t_num, c_table in cloud_tables_by_number.items():
        if t_num not in local_tables:
            try:
                l_guest = None
                if c_table.get('current_guest'):
                    l_guest = CustomUser.objects.filter(id=c_table.get('current_guest')).first()
                l_table = Table.objects.create(
                    table_number=c_table['table_number'],
                    capacity=c_table['capacity'],
                    status=c_table['status'],
                    current_guest=l_guest
                )
                local_tables[t_num] = l_table
                print(f"[Sync] Created table {t_num} locally.")
            except Exception as e:
                print(f"[Sync] Error creating table {t_num} locally: {e}")

    # 5. Sync TableReservations
    local_reservations = TableReservation.objects.all().select_related('table')
    local_res_dict = {}
    for r in local_reservations:
        key = (r.table.table_number, r.customer_name, r.reservation_time.isoformat())
        local_res_dict[key] = r

    cloud_res_dict = {}
    for cr in c_reservations:
        cr_time = parse_datetime(cr['reservation_time'])
        cr_time_iso = cr_time.isoformat() if cr_time else cr['reservation_time']
        key = (cr.get('table_number'), cr.get('customer_name'), cr_time_iso)
        cloud_res_dict[key] = cr

    # Local -> Cloud
    for key, l_res in local_res_dict.items():
        if key not in cloud_res_dict:
            try:
                c_table = cloud_tables_by_number.get(l_res.table.table_number)
                if c_table:
                    payload = {
                        "table": c_table['id'],
                        "customer_name": l_res.customer_name,
                        "reservation_time": l_res.reservation_time.isoformat(),
                        "status": l_res.status
                    }
                    res = requests.post(f"{CLOUD_URL}/api/table-reservations/", headers=headers, json=payload, timeout=10)
                    if res.status_code in [200, 201]:
                        print(f"[Sync] Created table reservation for {l_res.customer_name} on cloud.")
            except Exception as e:
                print(f"[Sync] Error creating table reservation for {l_res.customer_name} on cloud: {e}")
        else:
            c_res = cloud_res_dict[key]
            if l_res.status != c_res['status']:
                status_priority = {'BOOKED': 1, 'COMPLETED': 2, 'CANCELLED': 2}
                if status_priority.get(c_res['status'], 0) > status_priority.get(l_res.status, 0):
                    l_res.status = c_res['status']
                    l_res.save()
                    print(f"[Sync] Updated local reservation status to {c_res['status']}.")
                elif status_priority.get(l_res.status, 0) > status_priority.get(c_res['status'], 0):
                    try:
                        requests.patch(f"{CLOUD_URL}/api/table-reservations/{c_res['id']}/", headers=headers, json={"status": l_res.status}, timeout=10)
                    except Exception as e:
                        print(f"[Sync] Error updating cloud reservation: {e}")

    # Cloud -> Local
    for key, c_res in cloud_res_dict.items():
        if key not in local_res_dict:
            try:
                l_table = local_tables.get(key[0])
                if l_table:
                    TableReservation.objects.create(
                        table=l_table,
                        customer_name=c_res['customer_name'],
                        reservation_time=parse_datetime(c_res['reservation_time']),
                        status=c_res['status']
                    )
                    print(f"[Sync] Created table reservation for {c_res['customer_name']} locally.")
            except Exception as e:
                print(f"[Sync] Error creating reservation locally: {e}")

    # 6. Sync Orders & OrderItems
    local_menu_items = {item.id: item for item in MenuItem.objects.all()}
    local_orders = Order.objects.all().select_related('guest', 'table')
    local_orders_dict = {}
    for o in local_orders:
        t_num = o.table.table_number if o.table else None
        o_created = o.created_at
        if o_created.tzinfo is None:
            o_created = o_created.replace(tzinfo=datetime.timezone.utc)
        local_orders_dict[(o.guest.username, t_num, o_created.isoformat())] = o

    cloud_orders_dict = {}
    for co in c_orders:
        co_created = parse_datetime(co['created_at'])
        co_created_iso = co_created.isoformat() if co_created else co['created_at']
        cloud_orders_dict[(co.get('guest_name'), co.get('table_number'), co_created_iso)] = co

    # Align close matches within 1-minute window
    unmatched_local = []
    for key, l_order in list(local_orders_dict.items()):
        if key not in cloud_orders_dict:
            unmatched_local.append((key, l_order))

    for (l_key, l_order) in unmatched_local:
        l_username, l_t_num, l_created_iso = l_key
        l_created = parse_datetime(l_created_iso)
        for co in c_orders:
            co_username = co.get('guest_name')
            co_t_num = co.get('table_number')
            if co_username == l_username and co_t_num == l_t_num:
                co_created = parse_datetime(co['created_at'])
                if co_created and l_created:
                    diff = abs((co_created - l_created).total_seconds())
                    if diff <= 60:
                        Order.objects.filter(id=l_order.id).update(created_at=co_created)
                        new_key = (l_username, l_t_num, co_created.isoformat())
                        local_orders_dict[new_key] = l_order
                        del local_orders_dict[l_key]
                        print(f"[Sync] Matched local order {l_order.id} with cloud order {co['id']}.")
                        break

    # Local -> Cloud
    for key, l_order in local_orders_dict.items():
        if key not in cloud_orders_dict:
            try:
                c_user = cloud_users_by_username.get(l_order.guest.username)
                c_table = cloud_tables_by_number.get(l_order.table.table_number) if l_order.table else None
                if c_user:
                    payload = {
                        "guest": c_user['id'],
                        "table": c_table['id'] if c_table else None,
                        "status": l_order.status,
                        "total_amount": str(l_order.total_amount)
                    }
                    res = requests.post(f"{CLOUD_URL}/api/orders/", headers=headers, json=payload, timeout=10)
                    if res.status_code in [200, 201]:
                        new_co = res.json()
                        co_created = parse_datetime(new_co['created_at'])
                        if co_created:
                            Order.objects.filter(id=l_order.id).update(created_at=co_created)
                        print(f"[Sync] Created order {l_order.id} on cloud.")
                        
                        for l_item in l_order.items.all():
                            item_payload = {
                                "order": new_co['id'],
                                "menu_item": l_item.menu_item.id,
                                "quantity": l_item.quantity,
                                "price_at_order": str(l_item.price_at_order),
                                "status": l_item.status,
                                "notes": l_item.notes
                            }
                            requests.post(f"{CLOUD_URL}/api/order-items/", headers=headers, json=item_payload, timeout=10)
            except Exception as e:
                print(f"[Sync] Error creating order {l_order.id} on cloud: {e}")
        else:
            c_order = cloud_orders_dict[key]
            status_priority = {'PENDING': 1, 'PREPARING': 2, 'READY': 3, 'SERVED': 4, 'COMPLETED': 5, 'CANCELLED': 6}
            l_prio = status_priority.get(l_order.status, 0)
            c_prio = status_priority.get(c_order['status'], 0)
            
            if c_prio > l_prio:
                l_order.status = c_order['status']
                l_order.total_amount = c_order['total_amount']
                l_order.save()
                print(f"[Sync] Updated local order {l_order.id} status to {c_order['status']}.")
            elif l_prio > c_prio:
                try:
                    requests.patch(f"{CLOUD_URL}/api/orders/{c_order['id']}/", headers=headers, json={"status": l_order.status, "total_amount": str(l_order.total_amount)}, timeout=10)
                except Exception as e:
                    print(f"[Sync] Error updating cloud order: {e}")

            # Sync items
            l_items = {item.menu_item.id: item for item in l_order.items.all()}
            c_items = {item['menu_item']: item for item in c_order.get('items', [])}
            
            for item_id, l_item in l_items.items():
                if item_id not in c_items:
                    try:
                        item_payload = {
                            "order": c_order['id'],
                            "menu_item": l_item.menu_item.id,
                            "quantity": l_item.quantity,
                            "price_at_order": str(l_item.price_at_order),
                            "status": l_item.status,
                            "notes": l_item.notes
                        }
                        requests.post(f"{CLOUD_URL}/api/order-items/", headers=headers, json=item_payload, timeout=10)
                    except Exception as e:
                        print(f"[Sync] Error creating order item on cloud: {e}")
                else:
                    c_item = c_items[item_id]
                    item_prio = {'PENDING': 1, 'PREPARING': 2, 'READY': 3, 'SERVED': 4, 'CANCELLED': 5}
                    if item_prio.get(c_item['status'], 0) > item_prio.get(l_item.status, 0):
                        OrderItem.objects.filter(id=l_item.id).update(status=c_item['status'])
                    elif item_prio.get(l_item.status, 0) > item_prio.get(c_item['status'], 0):
                        try:
                            requests.patch(f"{CLOUD_URL}/api/order-items/{c_item['id']}/", headers=headers, json={"status": l_item.status}, timeout=10)
                        except Exception as e:
                            print(f"[Sync] Error updating cloud order item: {e}")

            for item_id, c_item in c_items.items():
                if item_id not in l_items:
                    try:
                        menu_item = local_menu_items.get(item_id)
                        if menu_item:
                            OrderItem.objects.create(
                                order=l_order,
                                menu_item=menu_item,
                                quantity=c_item['quantity'],
                                price_at_order=c_item['price_at_order'],
                                status=c_item['status'],
                                notes=c_item.get('notes')
                            )
                    except Exception as e:
                        print(f"[Sync] Error creating local order item: {e}")

    # Cloud -> Local
    for key, c_order in cloud_orders_dict.items():
        if key not in local_orders_dict:
            try:
                l_user = local_users.get(key[0])
                l_table = local_tables.get(key[1]) if key[1] else None
                if l_user:
                    l_order = Order.objects.create(
                        guest=l_user,
                        table=l_table,
                        status=c_order['status'],
                        total_amount=c_order['total_amount']
                    )
                    co_created = parse_datetime(c_order['created_at'])
                    if co_created:
                        Order.objects.filter(id=l_order.id).update(created_at=co_created)
                    
                    for c_item in c_order.get('items', []):
                        menu_item = local_menu_items.get(c_item['menu_item'])
                        if menu_item:
                            OrderItem.objects.create(
                                order=l_order,
                                menu_item=menu_item,
                                quantity=c_item['quantity'],
                                price_at_order=c_item['price_at_order'],
                                status=c_item['status'],
                                notes=c_item.get('notes')
                            )
                    print(f"[Sync] Created order locally for {key}.")
            except Exception as e:
                print(f"[Sync] Error creating order locally: {e}")

    # 7. Sync Invoices
    local_invoices = Invoice.objects.all().select_related('guest', 'booking')
    local_invoices_dict = {}
    for inv in local_invoices:
        inv_created = inv.created_at
        if inv_created.tzinfo is None:
            inv_created = inv_created.replace(tzinfo=datetime.timezone.utc)
        local_invoices_dict[(inv.guest.username, inv_created.isoformat())] = inv

    cloud_invoices_dict = {}
    for ci in c_invoices:
        ci_created = parse_datetime(ci['created_at'])
        ci_created_iso = ci_created.isoformat() if ci_created else ci['created_at']
        cloud_invoices_dict[(ci.get('guest_name'), ci_created_iso)] = ci

    # Align close matches within 1-minute window
    unmatched_local_inv = []
    for key, l_inv in list(local_invoices_dict.items()):
        if key not in cloud_invoices_dict:
            unmatched_local_inv.append((key, l_inv))

    for (l_key, l_inv) in unmatched_local_inv:
        l_username, l_created_iso = l_key
        l_created = parse_datetime(l_created_iso)
        for ci in c_invoices:
            if ci.get('guest_name') == l_username:
                ci_created = parse_datetime(ci['created_at'])
                if ci_created and l_created:
                    diff = abs((ci_created - l_created).total_seconds())
                    if diff <= 60:
                        Invoice.objects.filter(id=l_inv.id).update(created_at=ci_created)
                        new_key = (l_username, ci_created.isoformat())
                        local_invoices_dict[new_key] = l_inv
                        del local_invoices_dict[l_key]
                        print(f"[Sync] Matched local invoice {l_inv.id} with cloud invoice {ci['id']}.")
                        break

    # Local -> Cloud
    for key, l_inv in local_invoices_dict.items():
        if key not in cloud_invoices_dict:
            try:
                c_user = cloud_users_by_username.get(l_inv.guest.username)
                c_booking_id = None
                if l_inv.booking:
                    for cb in c_bookings:
                        if cb.get('guest_name') == l_inv.booking.guest.username and cb.get('room_number') == l_inv.booking.room.room_number and cb.get('check_in_date') == str(l_inv.booking.check_in_date):
                            c_booking_id = cb['id']
                            break
                
                c_order_ids = []
                for o in l_inv.orders.all():
                    o_created = o.created_at
                    if o_created.tzinfo is None:
                        o_created = o_created.replace(tzinfo=datetime.timezone.utc)
                    for co in c_orders:
                        co_created = parse_datetime(co['created_at'])
                        if co_created.tzinfo is None:
                            co_created = co_created.replace(tzinfo=datetime.timezone.utc)
                        if co.get('guest_name') == o.guest.username and co.get('table_number') == (o.table.table_number if o.table else None) and abs((co_created - o_created).total_seconds()) <= 60:
                            c_order_ids.append(co['id'])
                            break

                if c_user:
                    payload = {
                        "guest": c_user['id'],
                        "booking": c_booking_id,
                        "orders": c_order_ids,
                        "guest_type_at_billing": l_inv.guest_type_at_billing,
                        "room_charges": str(l_inv.room_charges),
                        "food_charges": str(l_inv.food_charges),
                        "tax_amount": str(l_inv.tax_amount),
                        "total_amount": str(l_inv.total_amount),
                        "payment_status": l_inv.payment_status
                    }
                    res = requests.post(f"{CLOUD_URL}/api/invoices/", headers=headers, json=payload, timeout=10)
                    if res.status_code in [200, 201]:
                        new_ci = res.json()
                        ci_created = parse_datetime(new_ci['created_at'])
                        if ci_created:
                            Invoice.objects.filter(id=l_inv.id).update(created_at=ci_created)
                        print(f"[Sync] Created invoice for {key} on cloud.")
            except Exception as e:
                print(f"[Sync] Error creating invoice on cloud: {e}")
        else:
            c_inv = cloud_invoices_dict[key]
            if l_inv.payment_status != c_inv['payment_status']:
                if c_inv['payment_status'] == 'PAID':
                    Invoice.objects.filter(id=l_inv.id).update(payment_status='PAID')
                    print(f"[Sync] Updated local invoice {l_inv.id} to PAID.")
                elif l_inv.payment_status == 'PAID':
                    try:
                        requests.patch(f"{CLOUD_URL}/api/invoices/{c_inv['id']}/", headers=headers, json={"payment_status": "PAID"}, timeout=10)
                        print(f"[Sync] Updated cloud invoice {c_inv['id']} to PAID.")
                    except Exception as e:
                        print(f"[Sync] Error updating cloud invoice status: {e}")

    # Cloud -> Local
    for key, c_inv in cloud_invoices_dict.items():
        if key not in local_invoices_dict:
            try:
                l_user = local_users.get(key[0])
                if l_user:
                    l_booking = None
                    if c_inv.get('booking'):
                        for cb in c_bookings:
                            if cb['id'] == c_inv.get('booking'):
                                l_booking_key = (cb.get('guest_name'), cb.get('room_number'), cb.get('check_in_date'))
                                l_booking = local_bookings_dict.get(l_booking_key)
                                break
                    
                    l_inv = Invoice.objects.create(
                        guest=l_user,
                        booking=l_booking,
                        guest_type_at_billing=c_inv['guest_type_at_billing'],
                        room_charges=c_inv['room_charges'],
                        food_charges=c_inv['food_charges'],
                        tax_amount=c_inv['tax_amount'],
                        total_amount=c_inv['total_amount'],
                        payment_status=c_inv['payment_status']
                    )
                    ci_created = parse_datetime(c_inv['created_at'])
                    if ci_created:
                        Invoice.objects.filter(id=l_inv.id).update(created_at=ci_created)
                    
                    local_orders_to_link = []
                    for co_id in c_inv.get('orders', []):
                        for co in c_orders:
                            if co['id'] == co_id:
                                co_created = parse_datetime(co['created_at'])
                                co_created_iso = co_created.isoformat() if co_created else co['created_at']
                                l_order = local_orders_dict.get((co.get('guest_name'), co.get('table_number'), co_created_iso))
                                if l_order:
                                    local_orders_to_link.append(l_order)
                                break
                    if local_orders_to_link:
                        l_inv.orders.set(local_orders_to_link)
                    
                    print(f"[Sync] Created invoice locally for {key}.")
            except Exception as e:
                print(f"[Sync] Error creating invoice locally for {key}: {e}")

def sync_loop():
    time.sleep(5)
    while True:
        try:
            sync_data()
        except Exception as e:
            print(f"[Sync] Error in sync loop: {e}")
        time.sleep(15)

def start_sync_thread():
    if os.environ.get('POSTGRES_DB'):
        print("[Sync] Running in production/Render. Background sync thread disabled.")
        return

    if os.environ.get('RUN_MAIN') != 'true':
        return

    thread = threading.Thread(target=sync_loop, daemon=True)
    thread.start()
    print("[Sync] Background sync thread started.")
