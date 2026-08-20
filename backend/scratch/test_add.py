import requests

# Login
login_resp = requests.post('http://localhost:8000/api/token/', json={'username': 'Rajeev7112', 'password': 'Rajeev123!'})
token = login_resp.json()['access']

# Test adding WITHOUT image
resp = requests.post(
    'http://localhost:8000/api/menu-items/',
    headers={'Authorization': 'Bearer ' + token},
    data={
        'name': 'No Image Test',
        'price': '50.00',
        'category': 1,
        'is_veg': 'true',
        'is_available': 'true',
        'description': 'test',
    },
)
print('Create status:', resp.status_code)
print('Response:', resp.text[:500])

# Now check the list
list_resp = requests.get('http://localhost:8000/api/menu-items/', headers={'Authorization': 'Bearer ' + token})
items = list_resp.json()
print('\nMenu items count:', len(items))
for item in items:
    print('  id=%d name=%s available=%s' % (item['id'], item['name'], item['is_available']))

# Now test with a REAL image file
import io
from PIL import Image

img = Image.new('RGB', (100, 100), color='red')
buf = io.BytesIO()
img.save(buf, format='PNG')
buf.seek(0)

resp2 = requests.post(
    'http://localhost:8000/api/menu-items/',
    headers={'Authorization': 'Bearer ' + token},
    data={
        'name': 'With Real Image',
        'price': '75.00',
        'category': 1,
        'is_veg': 'true',
        'is_available': 'true',
        'description': 'test with image',
    },
    files={'image': ('test.png', buf, 'image/png')},
)
print('\nCreate with image status:', resp2.status_code)
print('Response:', resp2.text[:500])

# Check list again
list_resp2 = requests.get('http://localhost:8000/api/menu-items/', headers={'Authorization': 'Bearer ' + token})
items2 = list_resp2.json()
print('\nMenu items count after image add:', len(items2))
for item in items2:
    print('  id=%d name=%s available=%s image=%s' % (item['id'], item['name'], item['is_available'], item.get('image', 'None')))
