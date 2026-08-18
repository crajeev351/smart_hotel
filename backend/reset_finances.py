import requests

CLOUD_URL = 'https://smart-hotel-mchq.onrender.com'
response = requests.post(f'{CLOUD_URL}/api/token/', json={'username': 'Rajeev7112', 'password': 'Rajeev123!'})
token = response.json().get('access')
headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

print('Logged in successfully, fetching data to delete...')

def delete_all(endpoint):
    res = requests.get(f'{CLOUD_URL}/api/{endpoint}/', headers=headers)
    if res.status_code == 200:
        items = res.json()
        print(f'Deleting {len(items)} {endpoint}...')
        for item in items:
            d_res = requests.delete(f'{CLOUD_URL}/api/{endpoint}/{item["id"]}/', headers=headers)
            if d_res.status_code not in [204, 200]:
                print(f'Failed to delete {item["id"]}: {d_res.text}')
    else:
        print(f'Failed to fetch {endpoint}: {res.text}')

delete_all('invoices')
delete_all('orders')
print('Finished resetting finances.')
