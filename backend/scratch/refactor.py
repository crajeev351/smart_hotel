import os
import re

files = [
    'd:/smart_hotel/frontend/src/pages/Restaurant.tsx',
    'd:/smart_hotel/frontend/src/pages/Kitchen.tsx',
    'd:/smart_hotel/frontend/src/pages/Admin.tsx',
    'd:/smart_hotel/frontend/src/pages/Rooms.tsx',
    'd:/smart_hotel/frontend/src/pages/Dashboard.tsx',
    'd:/smart_hotel/frontend/src/pages/Reception.tsx',
]

for fpath in files:
    if not os.path.exists(fpath):
        continue

    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if useWebSocket is already imported
    if 'useWebSocket' not in content:
        # Insert import after first import
        content = re.sub(r'(import .*?;)', r"\1\nimport { useWebSocket } from '../hooks/useWebSocket';", content, count=1)
    
    # Inject hook call after the first useState or similar inside component
    if 'useWebSocket(' not in content:
        # Find where the fetch data function is declared
        fetch_names = ['fetchData', 'fetchKitchenOrders', 'fetchDashboardData', 'fetchAdminData']
        fetch_fn = next((fn for fn in fetch_names if f'const {fn} = async' in content), None)
        
        if fetch_fn:
            hook_str = f"\n  useWebSocket((data) => {{\n    console.log('WebSocket update received:', data);\n    {fetch_fn}(true);\n  }});\n"
            content = content.replace(f'const {fetch_fn} = async', hook_str + f'\n  const {fetch_fn} = async', 1)
        else:
            print(f"Could not find fetch function in {fpath}")
            
    # Remove setInterval block
    content = re.sub(r'const interval = setInterval\(\(\) => \{[\s\S]*?\}, \d+\);', '', content)
    content = re.sub(r'return \(\) => clearInterval\(interval\);', '', content)
    content = re.sub(r'clearInterval\(interval\);', '', content)
    # Also in Restaurant.tsx there are multiple intervals
    content = re.sub(r'const orderInterval = setInterval\(\(\) => \{[\s\S]*?\}, \d+\);', '', content)
    content = re.sub(r'return \(\) => \{[\s\S]*?clearInterval.*?\}', '', content)

    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)
        
print("Refactoring complete.")
