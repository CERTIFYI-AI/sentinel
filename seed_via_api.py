import json, subprocess, os

SB_URL = 'https://vhparvughsygyknblkzt.supabase.co'
with open('dashboard/.env') as f:
    for line in f:
        if 'VITE_SUPABASE_ANON_KEY=' in line:
            SB_KEY = line.strip().split('=',1)[1]

# Get framework IDs
result = subprocess.run(['curl','-s',f'{SB_URL}/rest/v1/frameworks?select=id,code',
    '-H',f'apikey: {SB_KEY}','-H',f'Authorization: Bearer {SB_KEY}'],capture_output=True,text=True)
fw_map = {r['code']: r['id'] for r in json.loads(result.stdout)}
print(f'Frameworks: {len(fw_map)}')

# Load controls data
with open('gen_seed.py') as f:
    content = f.read()
content = content.rstrip().rstrip(',') + '\n}'
ld = {}
exec(content, {}, ld)
F = ld['F']
C = ld['C']
name_to_code = {name: code for code, name, *_ in F}

total = 0
for fw_name, controls in C.items():
    code = name_to_code.get(fw_name)
    if not code or code not in fw_map:
        print(f'SKIP: {fw_name}')
        continue
    fw_id = fw_map[code]
    rows = []
    for c in controls:
        rows.append({
            'framework_id': fw_id,
            'control_ref': c[1],
            'name': c[0],
            'description': c[2],
            'severity': 'Medium'
        })
    # POST in batch via upsert
    result = subprocess.run(['curl','-s','-X','POST',
        f'{SB_URL}/rest/v1/controls',
        '-H',f'apikey: {SB_KEY}',
        '-H',f'Authorization: Bearer {SB_KEY}',
        '-H','Content-Type: application/json',
        '-H','Prefer: resolution=merge-duplicates',
        '-d', json.dumps(rows)],capture_output=True,text=True)
    if result.returncode == 0 and ('error' not in result.stdout.lower() or result.stdout == ''):
        print(f'{code} ({fw_name}): {len(rows)} controls OK')
        total += len(rows)
    else:
        print(f'{code} ERROR: {result.stdout[:200]}')

print(f'Total seeded: {total}')
