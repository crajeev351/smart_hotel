import re
import os

filepath = 'D:/smart_hotel/frontend/src/pages/Reception.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace tailwind color classes
content = re.sub(r'bg-emerald-500', 'bg-amber-600', content)
content = re.sub(r'text-emerald-400', 'text-amber-400', content)
content = re.sub(r'border-emerald-500', 'border-amber-600', content)
content = re.sub(r'text-emerald-500', 'text-amber-500', content)

content = re.sub(r'bg-cyan-500', 'bg-amber-600', content)
content = re.sub(r'text-cyan-400', 'text-amber-400', content)
content = re.sub(r'border-cyan-500', 'border-amber-600', content)
content = re.sub(r'text-cyan-500', 'text-amber-500', content)
content = re.sub(r'shadow-cyan-500', 'shadow-amber-900', content)

# 2. Replace hardcoded neon greens
content = re.sub(r'bg-\[\#00ff88\]', 'bg-amber-500', content)
content = re.sub(r'text-\[\#00ff88\]', 'text-amber-400', content)
content = re.sub(r'border-\[\#00ff88\]', 'border-amber-500/50', content)
content = re.sub(r'shadow-\[\#00ff88\]', 'shadow-amber-900', content)

# 3. Replace arbitrary glowing shadows completely (removes the glowy neon look)
content = re.sub(r'shadow-\[0_0_[^\]]+\]', 'shadow-md shadow-black/20', content)

# 4. Update the active tabs from indigo-600 to a nice royal slate/amber combination
content = re.sub(r'bg-indigo-600', 'bg-slate-700 border border-amber-500/30', content)

# 5. The root container might have a very dark background that looks too "cyberpunk"
# We'll leave the root alone if it's not explicitly styled in Reception.tsx (usually App.tsx has it), 
# but if Reception has bg-[#0a0d16], we might make it slightly warmer.
content = re.sub(r'bg-\[\#0a0d16\]', 'bg-slate-900', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated Reception.tsx colors successfully.")
