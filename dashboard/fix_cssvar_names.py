"""
Fix incorrect CSS variable names used in color replacements.
--s-warn-tx should be --s-wn-tx
--s-info-tx should be --s-in-tx
Also fix --destructive in color contexts to use --s-er-tx (which is the proper text color var)
"""

import os
import glob

FIXES = [
    ('hsl(var(--s-warn-tx))', 'hsl(var(--s-wn-tx))'),
    ('hsl(var(--s-info-tx))', 'hsl(var(--s-in-tx))'),
    # Note: --destructive gives the hsl values tuple, so hsl(var(--destructive)) is valid
    # but --s-er-tx is the semantically correct "error text" color token
    # Keep --destructive as-is for now since it works in className="text-destructive"
    # but for style={{ color: ... }} use --s-er-tx
]

base = '/home/user/workspace/sentinel/dashboard/src/pages'
files = glob.glob(os.path.join(base, '**/*.tsx'), recursive=True)

changed = []
for filepath in sorted(files):
    with open(filepath, 'r') as f:
        content = f.read()
    original = content
    for old, new in FIXES:
        content = content.replace(old, new)
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        changed.append(filepath.replace(base + '/', ''))

print(f"Fixed {len(changed)} files:")
for f in changed:
    print(f"  {f}")
