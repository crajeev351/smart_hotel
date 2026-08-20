import os
import time
import datetime
import threading
import uuid
try:
    import requests
except ImportError:
    requests = None
from django.utils.dateparse import parse_datetime

CLOUD_URL = "https://smart-hotel-mchq.onrender.com"

def get_cloud_token():
    url = f"{CLOUD_URL}/api/token/"
    try:
        response = requests.post(url, json={
            "username": "Rajeev7112",
            "password": "Rajeev123!"
        }, timeout=25)
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
        users = requests.get(f"{CLOUD_URL}/api/users/", headers=headers, timeout=25).json()
        rooms = requests.get(f"{CLOUD_URL}/api/rooms/", headers=headers, timeout=25).json()
        bookings = requests.get(f"{CLOUD_URL}/api/bookings/", headers=headers, timeout=25).json()
        tables = requests.get(f"{CLOUD_URL}/api/tables/", headers=headers, timeout=25).json()
        reservations = requests.get(f"{CLOUD_URL}/api/table-reservations/", headers=headers, timeout=25).json()
        orders = requests.get(f"{CLOUD_URL}/api/orders/", headers=headers, timeout=25).json()
        invoices = requests.get(f"{CLOUD_URL}/api/invoices/", headers=headers, timeout=25).json()
        categories = requests.get(f"{CLOUD_URL}/api/categories/", headers=headers, timeout=25).json()
        menu_items = requests.get(f"{CLOUD_URL}/api/menu-items/", headers=headers, timeout=25).json()
        return users, rooms, bookings, tables, reservations, orders, invoices, categories, menu_items
    except Exception as e:
        print(f"[Sync] Failed to fetch cloud data: {e}")
        return None, None, None, None, None, None, None, None, None

def sync_data():
    from accounts.models import CustomUser
    from rooms.models import Room, Booking
    from orders.models import Table, TableReservation, Order, OrderItem, Invoice
    from menu.models import MenuItem, MenuCategory

    token = get_cloud_token()
    if not token:
        return

    c_data = fetch_cloud_data(token)
    c_users, c_rooms, c_bookings, c_tables, c_reservations, c_orders, c_invoices, c_categories, c_menu_items = c_data
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
                res = requests.post(f"{CLOUD_URL}/api/users/", headers=headers, json=payload, timeout=25)
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
            l_created = l_room.created_at
            if l_created.tzinfo is None:
                l_created = l_created.replace(tzinfo=datetime.timezone.utc)
            
            if (datetime.datetime.now(datetime.timezone.utc) - l_created).total_seconds() > 300:
                print(f"[Sync] Room {r_num} is missing on cloud and is old locally. Deleting locally.")
                Room.objects.filter(id=l_room.id).delete()
            else:
                try:
                    payload = {
                        "room_number": l_room.room_number,
                        "room_type": l_room.room_type,
                        "price_per_night": str(l_room.price_per_night),
                        "capacity": l_room.capacity,
                        "status": l_room.status,
                        "floor": l_room.floor
                    }
                    res = requests.post(f"{CLOUD_URL}/api/rooms/", headers=headers, json=payload, timeout=25)
                    if res.status_code in [200, 201]:
                        cloud_rooms_by_number[r_num] = res.json()
                        print(f"[Sync] Created room {r_num} on cloud.")
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
                            res = requests.patch(f"{CLOUD_URL}/api/rooms/{c_room['id']}/", headers=headers, json={"status": l_room.status}, timeout=25)
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
            c_created_str = c_room.get('created_at')
            c_created = parse_datetime(c_created_str) if c_created_str else None
            
            if c_created:
                if c_created.tzinfo is None:
                    c_created = c_created.replace(tzinfo=datetime.timezone.utc)
                if (datetime.datetime.now(datetime.timezone.utc) - c_created).total_seconds() > 300:
                    print(f"[Sync] Room {r_num} is missing locally and old on cloud. Deleting on cloud.")
                    try:
                        requests.delete(f"{CLOUD_URL}/api/rooms/{c_room['id']}/", headers=headers, timeout=25)
                    except Exception as e:
                        print(f"[Sync] Error deleting room {r_num} on cloud: {e}")
                    continue
            
            try:
                l_room = Room.objects.create(
                    room_number=c_room['room_number'],
                    room_type=c_room['room_type'],
                    price_per_night=c_room['price_per_night'],
                    capacity=c_room['capacity'],
                    status=c_room['status'],
                    floor=c_room['floor']
                )
                c_updated = parse_datetime(c_room.get('updated_at', ''))
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
                    res = requests.post(f"{CLOUD_URL}/api/bookings/", headers=headers, json=payload, timeout=25)
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
                    res = requests.patch(f"{CLOUD_URL}/api/bookings/{c_booking['id']}/", headers=headers, json=patch_payload, timeout=25)
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

    # Local -> Cloud & Bidirectional sync for Tables
    for t_num, l_table in local_tables.items():
        if t_num not in cloud_tables_by_number:
            l_updated = l_table.updated_at
            if l_updated.tzinfo is None:
                l_updated = l_updated.replace(tzinfo=datetime.timezone.utc)
            
            if (datetime.datetime.now(datetime.timezone.utc) - l_updated).total_seconds() > 300:
                print(f"[Sync] Table {t_num} is missing on cloud and is old locally. Deleting locally.")
                Table.objects.filter(id=l_table.id).delete()
            else:
                try:
                    payload = {
                        "table_number": l_table.table_number,
                        "capacity": l_table.capacity,
                        "status": l_table.status
                    }
                    res = requests.post(f"{CLOUD_URL}/api/tables/", headers=headers, json=payload, timeout=25)
                    if res.status_code in [200, 201]:
                        cloud_tables_by_number[t_num] = res.json()
                        print(f"[Sync] Created table {t_num} on cloud.")
                except Exception as e:
                    print(f"[Sync] Error creating table {t_num} on cloud: {e}")
        else:
            c_table = cloud_tables_by_number[t_num]
            l_updated = getattr(l_table, 'updated_at', None)
            c_updated = parse_datetime(c_table.get('updated_at')) if c_table.get('updated_at') else None
            
            if l_updated and c_updated:
                if l_updated.tzinfo is None:
                    l_updated = l_updated.replace(tzinfo=datetime.timezone.utc)
                if c_updated.tzinfo is None:
                    c_updated = c_updated.replace(tzinfo=datetime.timezone.utc)
                
                if l_table.status != c_table['status']:
                    if l_updated >= c_updated:
                        try:
                            c_guest_id = None
                            if l_table.current_guest:
                                c_guest = cloud_users_by_username.get(l_table.current_guest.username)
                                if c_guest:
                                    c_guest_id = c_guest['id']
                            res = requests.patch(f"{CLOUD_URL}/api/tables/{c_table['id']}/", headers=headers, json={"status": l_table.status, "current_guest": c_guest_id}, timeout=25)
                            if res.status_code == 200:
                                print(f"[Sync] Updated table {t_num} status on cloud to {l_table.status}.")
                        except Exception as e:
                            print(f"[Sync] Error updating table {t_num} on cloud: {e}")
                    else:
                        l_guest = None
                        if c_table.get('current_guest'):
                            l_guest = CustomUser.objects.filter(id=c_table.get('current_guest')).first()
                        Table.objects.filter(id=l_table.id).update(status=c_table['status'], current_guest=l_guest, updated_at=c_updated)
                        print(f"[Sync] Updated table {t_num} locally to status {c_table['status']}.")
            else:
                if l_table.status != c_table['status']:
                    try:
                        c_guest_id = None
                        if l_table.current_guest:
                            c_guest = cloud_users_by_username.get(l_table.current_guest.username)
                            if c_guest:
                                c_guest_id = c_guest['id']
                        res = requests.patch(f"{CLOUD_URL}/api/tables/{c_table['id']}/", headers=headers, json={"status": l_table.status, "current_guest": c_guest_id}, timeout=25)
                        if res.status_code == 200:
                            print(f"[Sync] Updated table {t_num} status on cloud to {l_table.status}.")
                    except Exception as e:
                        print(f"[Sync] Error updating table {t_num} on cloud: {e}")

    # Cloud -> Local for new Tables
    for t_num, c_table in cloud_tables_by_number.items():
        if t_num not in local_tables:
            c_updated_str = c_table.get('updated_at')
            c_updated = parse_datetime(c_updated_str) if c_updated_str else None
            
            if c_updated:
                if c_updated.tzinfo is None:
                    c_updated = c_updated.replace(tzinfo=datetime.timezone.utc)
                if (datetime.datetime.now(datetime.timezone.utc) - c_updated).total_seconds() > 300:
                    print(f"[Sync] Table {t_num} is missing locally and old on cloud. Deleting on cloud.")
                    try:
                        requests.delete(f"{CLOUD_URL}/api/tables/{c_table['id']}/", headers=headers, timeout=25)
                    except Exception as e:
                        print(f"[Sync] Error deleting table {t_num} on cloud: {e}")
                    continue
            
            try:
                Table.objects.create(
                    table_number=c_table['table_number'],
                    capacity=c_table['capacity'],
                    status=c_table['status']
                )
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
                    res = requests.post(f"{CLOUD_URL}/api/table-reservations/", headers=headers, json=payload, timeout=25)
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
                        requests.patch(f"{CLOUD_URL}/api/table-reservations/{c_res['id']}/", headers=headers, json={"status": l_res.status}, timeout=25)
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

    # 6. Sync Orders & OrderItems (Deduplicated with ID tracking to eliminate ping-pong loops)
    local_menu_items = {item.id: item for item in MenuItem.objects.all()}
    local_orders = list(Order.objects.all().select_related('guest', 'table'))

    matched_cloud_ids = set()
    matched_local_orders = {}  # local_order_id -> cloud_order_dict

    # Pass 1: Match by sync_id if both have it
    local_by_sync_id = {str(o.sync_id): o for o in local_orders if getattr(o, 'sync_id', None)}
    for co in c_orders:
        c_sync_id = str(co.get('sync_id', '')).strip()
        if c_sync_id and c_sync_id in local_by_sync_id:
            lo = local_by_sync_id[c_sync_id]
            matched_local_orders[lo.id] = co
            matched_cloud_ids.add(co['id'])

    # Pass 2: Fuzzy match remaining unmatched by (guest_username, table_number, approx created_at)
    for lo in local_orders:
        if lo.id in matched_local_orders:
            continue
        l_guest_name = lo.guest.username if lo.guest else None
        l_t_num = lo.table.table_number if lo.table else None
        l_created = lo.created_at
        if l_created.tzinfo is None:
            l_created = l_created.replace(tzinfo=datetime.timezone.utc)

        for co in c_orders:
            if co['id'] in matched_cloud_ids:
                continue
            if co.get('guest_name') == l_guest_name and co.get('table_number') == l_t_num:
                co_created = parse_datetime(co.get('created_at'))
                if co_created:
                    if co_created.tzinfo is None:
                        co_created = co_created.replace(tzinfo=datetime.timezone.utc)
                    if abs((co_created - l_created).total_seconds()) <= 120:
                        matched_local_orders[lo.id] = co
                        matched_cloud_ids.add(co['id'])
                        break

    # Local -> Cloud (Push unmatched local orders)
    for lo in local_orders:
        if lo.id not in matched_local_orders:
            try:
                c_user = cloud_users_by_username.get(lo.guest.username)
                c_table = cloud_tables_by_number.get(lo.table.table_number) if lo.table else None
                if c_user:
                    payload = {
                        "guest": c_user['id'],
                        "table": c_table['id'] if c_table else None,
                        "status": lo.status,
                        "total_amount": str(lo.total_amount)
                    }
                    if getattr(lo, 'sync_id', None):
                        payload["sync_id"] = str(lo.sync_id)
                    res = requests.post(f"{CLOUD_URL}/api/orders/", headers=headers, json=payload, timeout=25)
                    if res.status_code in [200, 201]:
                        new_co = res.json()
                        matched_cloud_ids.add(new_co['id'])
                        matched_local_orders[lo.id] = new_co
                        co_created = parse_datetime(new_co.get('created_at'))
                        if co_created:
                            Order.objects.filter(id=lo.id).update(created_at=co_created)
                        print(f"[Sync] Created order {lo.id} on cloud.")

                        for l_item in lo.items.all():
                            item_payload = {
                                "order": new_co['id'],
                                "menu_item": l_item.menu_item.id,
                                "quantity": l_item.quantity,
                                "price_at_order": str(l_item.price_at_order),
                                "status": l_item.status,
                                "notes": l_item.notes
                            }
                            requests.post(f"{CLOUD_URL}/api/order-items/", headers=headers, json=item_payload, timeout=25)
            except Exception as e:
                print(f"[Sync] Error creating order {lo.id} on cloud: {e}")
        else:
            # Sync status between matched orders
            co = matched_local_orders[lo.id]
            status_priority = {'PENDING': 1, 'PREPARING': 2, 'READY': 3, 'SERVED': 4, 'COMPLETED': 5, 'CANCELLED': 6}
            l_prio = status_priority.get(lo.status, 0)
            c_prio = status_priority.get(co.get('status'), 0)

            if c_prio > l_prio:
                lo.status = co['status']
                lo.total_amount = co['total_amount']
                lo.save()
                print(f"[Sync] Updated local order {lo.id} status to {co['status']}.")
            elif l_prio > c_prio:
                try:
                    requests.patch(f"{CLOUD_URL}/api/orders/{co['id']}/", headers=headers, json={"status": lo.status, "total_amount": str(lo.total_amount)}, timeout=25)
                except Exception as e:
                    print(f"[Sync] Error updating cloud order: {e}")

            # Sync items for matched order
            l_items = {item.menu_item.id: item for item in lo.items.all()}
            c_items = {item['menu_item']: item for item in co.get('items', [])}

            for item_id, l_item in l_items.items():
                if item_id not in c_items:
                    try:
                        item_payload = {
                            "order": co['id'],
                            "menu_item": l_item.menu_item.id,
                            "quantity": l_item.quantity,
                            "price_at_order": str(l_item.price_at_order),
                            "status": l_item.status,
                            "notes": l_item.notes
                        }
                        requests.post(f"{CLOUD_URL}/api/order-items/", headers=headers, json=item_payload, timeout=25)
                    except Exception as e:
                        print(f"[Sync] Error creating order item on cloud: {e}")
                else:
                    c_item = c_items[item_id]
                    item_prio = {'PENDING': 1, 'PREPARING': 2, 'READY': 3, 'SERVED': 4, 'CANCELLED': 5}
                    if item_prio.get(c_item['status'], 0) > item_prio.get(l_item.status, 0):
                        OrderItem.objects.filter(id=l_item.id).update(status=c_item['status'])
                    elif item_prio.get(l_item.status, 0) > item_prio.get(c_item['status'], 0):
                        try:
                            requests.patch(f"{CLOUD_URL}/api/order-items/{c_item['id']}/", headers=headers, json={"status": l_item.status}, timeout=25)
                        except Exception as e:
                            print(f"[Sync] Error updating cloud order item: {e}")

            for item_id, c_item in c_items.items():
                if item_id not in l_items:
                    try:
                        menu_item = local_menu_items.get(item_id)
                        if menu_item:
                            OrderItem.objects.create(
                                order=lo,
                                menu_item=menu_item,
                                quantity=c_item['quantity'],
                                price_at_order=c_item['price_at_order'],
                                status=c_item['status'],
                                notes=c_item.get('notes')
                            )
                    except Exception as e:
                        print(f"[Sync] Error creating local order item: {e}")

    # Cloud -> Local (Pull genuine unmatched cloud orders only)
    for co in c_orders:
        if co['id'] not in matched_cloud_ids:
            try:
                l_user = local_users.get(co.get('guest_name'))
                l_table = local_tables.get(co.get('table_number')) if co.get('table_number') else None
                if l_user:
                    l_order = Order.objects.create(
                        sync_id=co.get('sync_id') or uuid.uuid4().hex,
                        guest=l_user,
                        table=l_table,
                        status=co['status'],
                        total_amount=co['total_amount']
                    )
                    co_created = parse_datetime(co['created_at'])
                    if co_created:
                        Order.objects.filter(id=l_order.id).update(created_at=co_created)

                    for c_item in co.get('items', []):
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
                    matched_cloud_ids.add(co['id'])
                    print(f"[Sync] Created order locally from cloud order {co['id']}.")
            except Exception as e:
                print(f"[Sync] Error creating order locally: {e}")

    local_orders_dict = {}
    for lo in Order.objects.all().select_related('guest', 'table'):
        lo_created = lo.created_at
        if lo_created.tzinfo is None:
            lo_created = lo_created.replace(tzinfo=datetime.timezone.utc)
        table_num = lo.table.table_number if lo.table else None
        local_orders_dict[(lo.guest.username, table_num, lo_created.isoformat())] = lo

    # 7. Sync Invoices
    local_invoices = Invoice.objects.all().select_related('guest', 'booking')
    local_invoices_dict = {}
    for inv in local_invoices:
        inv_created = inv.created_at
        if inv_created.tzinfo is None:
            inv_created = inv_created.replace(tzinfo=datetime.timezone.utc)
        local_invoices_dict[(inv.guest.username, str(inv.total_amount), inv_created.isoformat())] = inv

    cloud_invoices_dict = {}
    for ci in c_invoices:
        ci_created = parse_datetime(ci['created_at'])
        ci_created_iso = ci_created.isoformat() if ci_created else ci['created_at']
        cloud_invoices_dict[(ci.get('guest_name'), str(ci.get('total_amount')), ci_created_iso)] = ci

    # Align close matches within 1-minute window
    unmatched_local_inv = []
    for key, l_inv in list(local_invoices_dict.items()):
        if key not in cloud_invoices_dict:
            unmatched_local_inv.append((key, l_inv))

    for (l_key, l_inv) in unmatched_local_inv:
        l_username, l_amount, l_created_iso = l_key
        l_created = parse_datetime(l_created_iso)
        for ci in c_invoices:
            if ci.get('guest_name') == l_username and str(ci.get('total_amount')) == l_amount:
                ci_created = parse_datetime(ci['created_at'])
                if ci_created and l_created:
                    diff = abs((ci_created - l_created).total_seconds())
                    if diff <= 60:
                        Invoice.objects.filter(id=l_inv.id).update(created_at=ci_created)
                        new_key = (l_username, l_amount, ci_created.isoformat())
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
                    res = requests.post(f"{CLOUD_URL}/api/invoices/", headers=headers, json=payload, timeout=25)
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
                        requests.patch(f"{CLOUD_URL}/api/invoices/{c_inv['id']}/", headers=headers, json={"payment_status": "PAID"}, timeout=25)
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

    # 7. Sync Menu Categories & Items
    local_cats = {c.name: c for c in MenuCategory.objects.all()}
    cloud_cats = {c['name']: c for c in c_categories}
    
    for name, l_cat in local_cats.items():
        if name not in cloud_cats:
            if time.time() - l_cat.updated_at.timestamp() < 300:
                requests.post(f"{CLOUD_URL}/api/categories/", headers=headers, json={'name': name, 'display_order': l_cat.display_order, 'is_active': l_cat.is_active}, timeout=25)
            else:
                l_cat.delete()
        else:
            c_cat = cloud_cats[name]
            c_time = parse_datetime(c_cat['updated_at']).timestamp()
            if l_cat.updated_at.timestamp() - c_time > 5:
                requests.patch(f"{CLOUD_URL}/api/categories/{c_cat['id']}/", headers=headers, json={'display_order': l_cat.display_order, 'is_active': l_cat.is_active}, timeout=25)
    
    for name, c_cat in cloud_cats.items():
        if name not in local_cats:
            if time.time() - parse_datetime(c_cat['updated_at']).timestamp() < 300:
                MenuCategory.objects.create(name=name, display_order=c_cat['display_order'], is_active=c_cat['is_active'])
            else:
                requests.delete(f"{CLOUD_URL}/api/categories/{c_cat['id']}/", headers=headers, timeout=25)
        else:
            l_cat = local_cats[name]
            c_time = parse_datetime(c_cat['updated_at']).timestamp()
            if c_time - l_cat.updated_at.timestamp() > 5:
                l_cat.display_order = c_cat['display_order']
                l_cat.is_active = c_cat['is_active']
                l_cat.save()

    c_categories = requests.get(f"{CLOUD_URL}/api/categories/", headers=headers, timeout=25).json()
    cat_map = {c['name']: c['id'] for c in c_categories}
    l_cat_map = {c.name: c.id for c in MenuCategory.objects.all()}

    local_items = {i.name: i for i in MenuItem.objects.all()}
    cloud_items = {i['name']: i for i in c_menu_items}

    def get_local_image_path(image_field):
        if not image_field or not image_field.name:
            return None
        clean = str(image_field.name).lstrip('/\\')
        try:
            if hasattr(image_field, 'path') and os.path.exists(image_field.path):
                return image_field.path
        except Exception:
            pass
        from django.conf import settings
        p = os.path.join(settings.MEDIA_ROOT, clean)
        return p if os.path.exists(p) else None

    for name, l_item in local_items.items():
        if name not in cloud_items:
            if time.time() - l_item.updated_at.timestamp() < 300:
                cat_id = cat_map.get(l_item.category.name)
                if cat_id:
                    img_path = get_local_image_path(l_item.image)
                    if img_path:
                        try:
                            with open(img_path, 'rb') as img_f:
                                files = {'image': (os.path.basename(img_path), img_f, 'image/jpeg')}
                                payload = {
                                    'name': name,
                                    'description': l_item.description or '',
                                    'price': str(l_item.price),
                                    'is_veg': str(l_item.is_veg).lower(),
                                    'is_available': str(l_item.is_available).lower(),
                                    'category': cat_id,
                                }
                                requests.post(f"{CLOUD_URL}/api/menu-items/", headers=headers, data=payload, files=files, timeout=25)
                        except Exception as e:
                            print(f"[Sync] Error uploading menu item with image: {e}")
                            requests.post(f"{CLOUD_URL}/api/menu-items/", headers=headers, json={'name': name, 'description': l_item.description, 'price': str(l_item.price), 'is_veg': l_item.is_veg, 'is_available': l_item.is_available, 'category': cat_id}, timeout=25)
                    else:
                        requests.post(f"{CLOUD_URL}/api/menu-items/", headers=headers, json={'name': name, 'description': l_item.description, 'price': str(l_item.price), 'is_veg': l_item.is_veg, 'is_available': l_item.is_available, 'category': cat_id}, timeout=25)
            else:
                l_item.delete()
        else:
            c_item = cloud_items[name]
            c_time = parse_datetime(c_item['updated_at']).timestamp()
            img_path = get_local_image_path(l_item.image)
            missing_cloud_image = bool(img_path and not c_item.get('image'))
            if l_item.updated_at.timestamp() - c_time > 5 or missing_cloud_image:
                cat_id = cat_map.get(l_item.category.name)
                if cat_id:
                    if img_path:
                        try:
                            with open(img_path, 'rb') as img_f:
                                files = {'image': (os.path.basename(img_path), img_f, 'image/jpeg')}
                                payload = {
                                    'description': l_item.description or '',
                                    'price': str(l_item.price),
                                    'is_veg': str(l_item.is_veg).lower(),
                                    'is_available': str(l_item.is_available).lower(),
                                    'category': cat_id,
                                }
                                requests.patch(f"{CLOUD_URL}/api/menu-items/{c_item['id']}/", headers=headers, data=payload, files=files, timeout=25)
                        except Exception as e:
                            print(f"[Sync] Error patching menu item with image: {e}")
                            requests.patch(f"{CLOUD_URL}/api/menu-items/{c_item['id']}/", headers=headers, json={'description': l_item.description, 'price': str(l_item.price), 'is_veg': l_item.is_veg, 'is_available': l_item.is_available, 'category': cat_id}, timeout=25)
                    else:
                        requests.patch(f"{CLOUD_URL}/api/menu-items/{c_item['id']}/", headers=headers, json={'description': l_item.description, 'price': str(l_item.price), 'is_veg': l_item.is_veg, 'is_available': l_item.is_available, 'category': cat_id}, timeout=25)

    for name, c_item in cloud_items.items():
        if name not in local_items:
            if is_menu_item_recently_deleted(name):
                print(f"[Sync] Skipping recreation of recently deleted item: {name}")
                try:
                    requests.delete(f"{CLOUD_URL}/api/menu-items/{c_item['id']}/", headers=headers, timeout=5)
                except Exception as e:
                    pass
                continue

            if time.time() - parse_datetime(c_item['updated_at']).timestamp() < 300:
                c_cat_data = next((c for c in c_categories if c['id'] == c_item['category']), None)
                if c_cat_data and c_cat_data['name'] in l_cat_map:
                    new_item = MenuItem.objects.create(name=name, description=c_item['description'], price=c_item['price'], is_veg=c_item['is_veg'], is_available=c_item['is_available'], category_id=l_cat_map[c_cat_data['name']])
                    if c_item.get('image') and isinstance(c_item['image'], str):
                        img_val = c_item['image']
                        if img_val.startswith('http://') or img_val.startswith('https://'):
                            try:
                                img_res = requests.get(img_val, timeout=10)
                                if img_res.status_code == 200:
                                    from django.core.files.base import ContentFile
                                    fname = os.path.basename(img_val.split('?')[0])
                                    new_item.image.save(fname, ContentFile(img_res.content), save=True)
                            except Exception as e:
                                print(f"[Sync] Could not download cloud image for {name}: {e}")
                        elif img_val.startswith('/menu_images/'):
                            new_item.image = img_val
                            new_item.save(update_fields=['image'])
            else:
                requests.delete(f"{CLOUD_URL}/api/menu-items/{c_item['id']}/", headers=headers, timeout=25)
        else:
            l_item = local_items[name]
            c_time = parse_datetime(c_item['updated_at']).timestamp()
            if c_time - l_item.updated_at.timestamp() > 5:
                c_cat_data = next((c for c in c_categories if c['id'] == c_item['category']), None)
                if c_cat_data and c_cat_data['name'] in l_cat_map:
                    l_item.description = c_item['description']
                    l_item.price = c_item['price']
                    l_item.is_veg = c_item['is_veg']
                    l_item.is_available = c_item['is_available']
                    l_item.category_id = l_cat_map[c_cat_data['name']]
                    if not l_item.image and c_item.get('image') and isinstance(c_item['image'], str):
                        img_val = c_item['image']
                        if img_val.startswith('http://') or img_val.startswith('https://'):
                            try:
                                img_res = requests.get(img_val, timeout=10)
                                if img_res.status_code == 200:
                                    from django.core.files.base import ContentFile
                                    fname = os.path.basename(img_val.split('?')[0])
                                    l_item.image.save(fname, ContentFile(img_res.content), save=False)
                            except Exception as e:
                                pass
                        elif img_val.startswith('/menu_images/'):
                            l_item.image = img_val
                    l_item.save()

recently_deleted_lock = threading.Lock()
recently_deleted_menu_items = {} # name -> timestamp

def register_deleted_menu_item(name):
    with recently_deleted_lock:
        recently_deleted_menu_items[name] = time.time()

def is_menu_item_recently_deleted(name):
    now = time.time()
    with recently_deleted_lock:
        expired = [k for k, v in recently_deleted_menu_items.items() if now - v > 60]
        for k in expired:
            del recently_deleted_menu_items[k]
        return name in recently_deleted_menu_items

def propagate_delete_to_cloud(name):
    if not requests:
        return
    token = get_cloud_token()
    if not token:
        print(f"[Sync] propagate_delete_to_cloud: Failed to get cloud token.")
        return
    headers = {"Authorization": f"Bearer {token}"}
    try:
        response = requests.get(f"{CLOUD_URL}/api/menu-items/", headers=headers, timeout=10)
        if response.status_code == 200:
            cloud_items = response.json()
            for item in cloud_items:
                if item.get('name') == name:
                    del_res = requests.delete(f"{CLOUD_URL}/api/menu-items/{item['id']}/", headers=headers, timeout=10)
                    if del_res.status_code in [200, 204]:
                        print(f"[Sync] Propagated delete for menu item '{name}' (ID {item['id']}) to cloud.")
                    else:
                        print(f"[Sync] Failed to propagate delete for '{name}' to cloud: {del_res.status_code} - {del_res.text}")
        else:
            print(f"[Sync] propagate_delete_to_cloud: Failed to fetch cloud items: {response.status_code}")
    except Exception as e:
        print(f"[Sync] Exception while propagating delete for '{name}' to cloud: {e}")

sync_event = threading.Event()

def sync_loop():
    time.sleep(5)
    while True:
        try:
            sync_data()
        except Exception as e:
            print(f"[Sync] Error in sync loop: {e}")
        
        # Wait up to 3 seconds, or instantly if event is set
        sync_event.wait(3)
        sync_event.clear()

def start_sync_thread():
    if os.environ.get('POSTGRES_DB'):
        print("[Sync] Running in production/Render. Background sync thread disabled.")
        return

    if os.environ.get('RUN_MAIN') != 'true':
        return

    thread = threading.Thread(target=sync_loop, daemon=True)
    thread.start()
    print("[Sync] Background sync thread started.")
