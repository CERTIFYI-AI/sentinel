import json, subprocess, re

SB_URL = 'https://vhparvughsygyknblkzt.supabase.co'
with open('dashboard/.env') as f:
    for line in f:
        if 'VITE_SUPABASE_ANON_KEY=' in line:
            SB_KEY = line.strip().split('=',1)[1]

# Get framework name->id map
result = subprocess.run(['curl','-s',f'{SB_URL}/rest/v1/frameworks?select=id,name',
    '-H',f'apikey: {SB_KEY}','-H',f'Authorization: Bearer {SB_KEY}'],capture_output=True,text=True)
fw_map = {r['name']: r['id'] for r in json.loads(result.stdout)}

# Read PolicyTemplates.tsx and extract TEMPLATES array
with open('dashboard/src/pages/PolicyTemplates.tsx') as f:
    content = f.read()

# Extract each template object
pattern = r"\{\s*id:\s*(\d+),\s*name:\s*'([^']*)',\s*framework:\s*'([^']*)',\s*article:\s*'([^']*)',\s*category:\s*'([^']*)',\s*risk_level:\s*'([^']*)',\s*status:\s*'([^']*)',\s*used_by:\s*(\d+),\s*last_updated:\s*'([^']*)',\s*description:\s*'([^']*)'"
matches = re.findall(pattern, content)

fw_name_map = {
    'EU AI Act': 'EU AI Act',
    'NIST AI RMF': 'NIST AI RMF 1.0',
    'ISO 42001': 'ISO/IEC 42001',
    'GDPR': 'GDPR',
    'OECD AI': 'OECD AI Principles',
    'Singapore MAIF': 'Singapore Model AI Framework',
    'OWASP LLM': 'OWASP LLM Top 10',
}

rows = []
for m in matches:
    tid, name, fw, article, cat, risk, status, used, updated, desc = m
    slug = name.lower().replace(' ','-').replace('/','-')[:128]
    fw_id = None
    for key, val in fw_name_map.items():
        if key in fw:
            fw_id = fw_map.get(val)
            break
    row = {
        'slug': slug,
        'name': name,
        'framework_ref': f'{fw} - {article}',
        'clause': article,
        'category': cat,
        'risk_level': risk,
        'status': status,
    }
    if fw_id:
        row['framework_id'] = fw_id
    rows.append(row)

result = subprocess.run(['curl','-s','-X','POST',f'{SB_URL}/rest/v1/policy_templates',
    '-H',f'apikey: {SB_KEY}','-H',f'Authorization: Bearer {SB_KEY}',
    '-H','Content-Type: application/json','-H','Prefer: resolution=merge-duplicates',
    '-d',json.dumps(rows)],capture_output=True,text=True)
if 'error' not in result.stdout.lower() or result.stdout == '':
    print(f'Policy templates: {len(rows)} OK')
else:
    print(f'ERROR: {result.stdout[:300]}')
