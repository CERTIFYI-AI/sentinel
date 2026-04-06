"""
Fix duplicate className attributes produced by the color replacement script.
When an element already had className="...", the script added another className="..."
We need to merge them into a single className="... new-class".

Also fix the remaining ternary-expression style={{ color: condition ? hsl1 : hsl2 }} cases
by replacing hardcoded hsl values with CSS vars.
"""

import re
import os
import glob

HSL_TO_CSSVAR = {
    'hsl(0 72% 51%)': 'hsl(var(--destructive))',
    'hsl(142 71% 45%)': 'hsl(var(--s-ok-tx))',
    'hsl(38 92% 50%)': 'hsl(var(--s-warn-tx))',
    'hsl(220 90% 56%)': 'hsl(var(--s-info-tx))',
    'hsl(45 93% 47%)': 'hsl(var(--s-warn-tx))',
    'hsl(25 95% 53%)': 'hsl(var(--s-warn-tx))',
}


def fix_duplicate_classnames(content):
    """
    Fix pattern: className="existing-class" className="new-class"
    → className="existing-class new-class"
    
    Also handles cases where the second className comes after other attributes.
    """
    # Find adjacent classNames: className="A" ... className="B" on same tag
    # Simple approach: merge any two consecutive className= on same element opening tag
    
    # Pattern: className="A" className="B" (possibly with other attrs between, but handle simple case first)
    # Direct adjacency: className="A" className="B"
    content = re.sub(
        r'className="([^"]*?)"\s+className="([^"]*?)"',
        lambda m: f'className="{m.group(1)} {m.group(2)}"',
        content
    )
    return content


def fix_ternary_hsl(content):
    """Replace hardcoded hsl values within ternary expressions in style color."""
    for hsl_val, css_var in HSL_TO_CSSVAR.items():
        escaped = re.escape(hsl_val)
        # Replace any remaining occurrence of the hsl value in string literals
        # within style= contexts (color: ... ? hsl : hsl)
        content = content.replace(f"'{hsl_val}'", f"'{css_var}'")
    return content


def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    original = content
    content = fix_duplicate_classnames(content)
    content = fix_ternary_hsl(content)

    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        return True
    return False


base = '/home/user/workspace/sentinel/dashboard/src/pages'
files = glob.glob(os.path.join(base, '**/*.tsx'), recursive=True)

changed = []
for f in sorted(files):
    if process_file(f):
        changed.append(f.replace(base + '/', ''))

print(f"Modified {len(changed)} files:")
for f in changed:
    print(f"  {f}")
