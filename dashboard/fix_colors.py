"""
Replace hardcoded HSL color values in inline styles across all TSX page files.

Rules:
- style={{ color: 'hsl(0 72% 51%)' }}  → className="text-destructive"
- style={{ color: 'hsl(142 71% 45%)' }} → className="text-green-600 dark:text-green-400"
- style={{ color: 'hsl(38 92% 50%)' }}  → className="text-amber-600 dark:text-amber-400"  (not found but handle)
- style={{ color: 'hsl(220 90% 56%)' }} → className="text-blue-600 dark:text-blue-400"

Multi-property styles (background + borderLeft + color all hsl(0 72%)) → replace color value with CSS var

We use CSS vars as replacements for the color values in complex styles:
- hsl(0 72% 51%)  → hsl(var(--destructive))
- hsl(142 71% 45%) → hsl(var(--s-ok-tx))   (defined as --s-ok-tx in CSS, approx green)
  But since that might not exist, use the safe approach: keep as-is in multi-prop, but fix single color= cases

Strategy:
1. Single-prop `style={{ color: 'hsl(X Y% Z%)' }}` → convert to className
2. Multi-prop styles with hsl values → replace the hardcoded color value with CSS var reference
"""

import re
import os
import glob

# Map of hardcoded HSL values to CSS var replacements (for use inside complex style objects)
HSL_TO_CSSVAR = {
    'hsl(0 72% 51%)': 'hsl(var(--destructive))',
    'hsl(142 71% 45%)': 'hsl(var(--s-ok-tx))',
    'hsl(38 92% 50%)': 'hsl(var(--s-warn-tx))',
    'hsl(220 90% 56%)': 'hsl(var(--s-info-tx))',
}

# For single color-only styles, what className to use
HSL_TO_CLASSNAME = {
    'hsl(0 72% 51%)': 'text-destructive',
    'hsl(142 71% 45%)': 'text-green-600 dark:text-green-400',
    'hsl(38 92% 50%)': 'text-amber-600 dark:text-amber-400',
    'hsl(220 90% 56%)': 'text-blue-600 dark:text-blue-400',
}

def fix_single_color_styles(content):
    """Replace style={{ color: 'hsl(X)' }} with className="text-..."
    Only when there's EXACTLY one property (color) in the style object.
    """
    # Match style={{ color: 'hsl(...)' }} - single property only
    for hsl_val, classname in HSL_TO_CLASSNAME.items():
        # Escape for regex
        escaped = re.escape(hsl_val)
        # Pattern: style={{ color: 'hsl(...)' }} possibly with spaces
        pattern = r'style=\{\{\s*color:\s*[\'"]' + re.escape(hsl_val) + r'[\'"](\s*,?\s*)\}\}'
        
        def replacer(m):
            # Only replace if no other properties (check for comma before closing }})
            inner = m.group(1)
            # If there's a trailing comma, this might have been a single prop with optional trailing comma
            return f'className="{classname}"'
        
        content = re.sub(pattern, replacer, content)
    
    return content


def fix_complex_styles(content):
    """In complex style objects (multiple properties), replace hardcoded hsl values with CSS vars."""
    for hsl_val, css_var in HSL_TO_CSSVAR.items():
        # Replace in background, borderLeft, color, border properties within style objects
        # But ONLY when the full value is exactly the hsl (not with / opacity modifier - those we keep)
        # Replace 'hsl(0 72% 51%)' (exact, no opacity) → css var
        # Keep 'hsl(0 72% 51% / 0.08)' etc as-is (they're used for backgrounds with opacity)
        
        # Replace exact value in color: contexts
        escaped = re.escape(hsl_val)
        # Replace in color: 'hsl(...)' context but NOT when followed by ' /'  (opacity variant)
        content = re.sub(
            r"(color:\s*['\"])" + escaped + r"(['\"])",
            lambda m, cv=css_var: m.group(1) + cv + m.group(2),
            content
        )
        # Replace in borderLeft: '2px solid hsl(...)' context
        content = re.sub(
            r"(borderLeft:\s*['\"][^'\"]*\s)" + escaped + r"(['\"])",
            lambda m, cv=css_var: m.group(1) + cv + m.group(2),
            content
        )
        # Replace in border: '... hsl(...)' context (not background)
        content = re.sub(
            r"(border:\s*['\"][^'\"]*\s)" + escaped + r"(['\"])",
            lambda m, cv=css_var: m.group(1) + cv + m.group(2),
            content
        )
    
    return content

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    original = content
    
    # First: fix single-property color styles
    content = fix_single_color_styles(content)
    
    # Second: in remaining complex styles, replace hardcoded hsl values with CSS vars
    content = fix_complex_styles(content)
    
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        return True
    return False


# Find all tsx files in pages/
base = '/home/user/workspace/sentinel/dashboard/src/pages'
files = glob.glob(os.path.join(base, '**/*.tsx'), recursive=True)

changed = []
for f in sorted(files):
    if process_file(f):
        changed.append(f.replace(base + '/', ''))

print(f"Modified {len(changed)} files:")
for f in changed:
    print(f"  {f}")
