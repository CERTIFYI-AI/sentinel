import re, sys

# Parse gen_seed.py as data
with open('gen_seed.py') as f:
    content = f.read()

# Fix: close the dict properly
content = content.rstrip().rstrip(',') + '\n}'

# Execute to get F and C
locals_dict = {}
exec(content, {}, locals_dict)
F = locals_dict['F']
C = locals_dict['C']

def esc(s):
    return s.replace("'", "''")

# Generate framework INSERTs
print("-- Seed frameworks")
for code, name, cat, desc, juris in F:
    print(f"INSERT INTO frameworks (code, name, category, description, jurisdiction, control_count, type, version) "
          f"VALUES ('{esc(code)}','{esc(name)}','{esc(cat)}','{esc(desc)}','{esc(juris)}',0,'{esc(cat)}','1.0') "
          f"ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, category=EXCLUDED.category, description=EXCLUDED.description, jurisdiction=EXCLUDED.jurisdiction;")

print()
print("-- Seed controls")
total = 0
for fw_name, controls in C.items():
    for ctrl in controls:
        title, ref, desc = ctrl[0], ctrl[1], ctrl[2]
        cat = ctrl[3] if len(ctrl) > 3 else None
        sev = ctrl[4] if len(ctrl) > 4 else 'Medium'
        # Find matching framework code
        fw_code = None
        for code, name, *_ in F:
            if name == fw_name:
                fw_code = code
                break
        if not fw_code:
            print(f"-- WARNING: no framework match for '{fw_name}'", file=sys.stderr)
            continue
        cat_sql = f"'{esc(cat)}'" if cat else 'NULL'
        print(f"INSERT INTO controls (framework_id, control_ref, name, description, category, severity) "
              f"SELECT f.id, '{esc(ref)}', '{esc(title)}', '{esc(desc)}', {cat_sql}, '{esc(sev)}' "
              f"FROM frameworks f WHERE f.code='{esc(fw_code)}' "
              f"ON CONFLICT (framework_id, control_ref) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description;")
        total += 1

print(f"\n-- Total controls: {total}", file=sys.stderr)

# Update control_count
print()
print("-- Update framework control counts")
print("UPDATE frameworks SET control_count = (SELECT COUNT(*) FROM controls WHERE controls.framework_id = frameworks.id);")
