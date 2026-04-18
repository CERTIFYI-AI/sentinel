import sys
with open('gen_seed.py') as f:
    content = f.read()
content = content.rstrip().rstrip(',') + '\n}'
ld = {}
exec(content, {}, ld)
F = ld['F']
C = ld['C']
def esc(s): return s.replace("'", "''")

# Map framework names to codes
fmap = {name: code for code, name, *_ in F}

for fw_name, controls in C.items():
    code = fmap.get(fw_name)
    if not code: continue
    safe = code.replace('-','_')
    with open(f'seed_{safe}.sql', 'w') as out:
        rows = []
        for c in controls:
            title, ref, desc = c[0], c[1], c[2]
            rows.append(f"('{esc(ref)}','{esc(title)}','{esc(desc)}','Medium')")
        out.write(f"INSERT INTO controls (framework_id, control_ref, name, description, severity)\n")
        out.write(f"SELECT f.id, v.ref, v.name, v.desc, v.sev FROM frameworks f,\n")
        out.write(f"(VALUES\n")
        out.write(',\n'.join(rows))
        out.write(f"\n) AS v(ref, name, desc, sev)\n")
        out.write(f"WHERE f.code='{code}'\n")
        out.write(f"ON CONFLICT (framework_id, control_ref) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description;\n")
        print(f"{safe}: {len(controls)} controls -> seed_{safe}.sql")

print(f"Total frameworks: {len(C)}")
