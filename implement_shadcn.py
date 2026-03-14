#!/usr/bin/env python3
"""Batch convert all pages to use shadcn/ui design system."""
import os, re, glob

base = '/home/g8h45k4r/sentinel/dashboard/src'

def get_depth(fpath):
    """Get relative import depth from pages/X/Y.tsx to components/ui/"""
    rel = os.path.relpath(fpath, f'{base}/pages')
    depth = rel.count('/')
    return '../' * (depth + 1)

def convert_page(fpath):
    with open(fpath) as f:
        content = f.read()
    original = content
    depth = get_depth(fpath)
    
    # Skip if already fully converted (has shadcn Table imports)
    if 'TableRow' in content and 'TableCell' in content and '@phosphor-icons/react' in content:
        return False
    
    # Pattern: raw <table> -> shadcn Table
    if '<table' in content.lower():
        # Add shadcn Table import if missing
        if 'TableRow' not in content:
            # Find the right import path depth
            table_import = f"import {{ Table, TableHeader, TableBody, TableRow, TableHead, TableCell }} from '{depth}components/ui/table';"
            # Add after last import
            last_import = content.rfind('import ')
            end_of_last_import = content.find(';', last_import) + 1
            content = content[:end_of_last_import] + '\n' + table_import + content[end_of_last_import:]
        
        # Replace raw table tags
        content = re.sub(r'<table([^>]*)>', r'<Table\1>', content)
        content = content.replace('</table>', '</Table>')
        content = re.sub(r'<thead([^>]*)>', r'<TableHeader\1>', content)
        content = content.replace('</thead>', '</TableHeader>')
        content = re.sub(r'<tbody([^>]*)>', r'<TableBody\1>', content)
        content = content.replace('</tbody>', '</TableBody>')
        content = re.sub(r'<tr([^>]*)>', r'<TableRow\1>', content)
        content = content.replace('</tr>', '</TableRow>')
        content = re.sub(r'<th([^>]*)>', r'<TableHead\1>', content)
        content = content.replace('</th>', '</TableHead>')
        content = re.sub(r'<td([^>]*)>', r'<TableCell\1>', content)
        content = content.replace('</td>', '</TableCell>')
    
    # Add Badge import if Badge is used but not imported
    if 'Badge' in content and "from '" not in content.split('Badge')[0].split('\n')[-1]:
        if "import Badge" not in content and "import { Badge" not in content:
            badge_import = f"import Badge from '{depth}components/ui/badge';"
            last_import = content.rfind('import ')
            end_of_last_import = content.find(';', last_import) + 1
            content = content[:end_of_last_import] + '\n' + badge_import + content[end_of_last_import:]
    
    # Add Card imports if Card-like divs exist
    if ('Card' in content or 'card' in content) and 'CardContent' not in content:
        card_import = f"import {{ Card, CardHeader, CardContent, CardTitle }} from '{depth}components/ui/card';"
        if card_import not in content and 'CardContent' not in content:
            # Don't add if it's just classNames with 'card'
            pass
    
    # Add Phosphor icons import if missing
    if '@phosphor-icons/react' not in content:
        # Determine which icons are needed based on page content
        icons_needed = []
        rel = os.path.relpath(fpath, f'{base}/pages')
        
        # Map page categories to icons
        if 'vendor' in rel.lower(): icons_needed = ['Buildings', 'Plus', 'MagnifyingGlass', 'Warning']
        elif 'trust' in rel.lower(): icons_needed = ['ShieldCheck', 'Plus', 'MagnifyingGlass', 'Warning']
        elif 'task' in rel.lower(): icons_needed = ['CheckSquare', 'Plus', 'MagnifyingGlass']
        elif 'risk' in rel.lower() or 'incident' in rel.lower(): icons_needed = ['Warning', 'Plus', 'MagnifyingGlass']
        elif 'model' in rel.lower(): icons_needed = ['Robot', 'Plus', 'MagnifyingGlass']
        elif 'agent' in rel.lower(): icons_needed = ['Broadcast', 'Plus', 'MagnifyingGlass']
        elif 'dataset' in rel.lower(): icons_needed = ['Database', 'Plus', 'MagnifyingGlass']
        elif 'polic' in rel.lower(): icons_needed = ['FileText', 'Plus', 'MagnifyingGlass']
        elif 'control' in rel.lower(): icons_needed = ['Shield', 'Plus', 'MagnifyingGlass']
        elif 'evidence' in rel.lower(): icons_needed = ['FolderOpen', 'Plus', 'MagnifyingGlass']
        elif 'audit' in rel.lower() or 'bias' in rel.lower(): icons_needed = ['Scales', 'Plus', 'MagnifyingGlass']
        elif 'benchmark' in rel.lower(): icons_needed = ['ChartBar', 'Plus', 'MagnifyingGlass']
        elif 'export' in rel.lower() or 'report' in rel.lower(): icons_needed = ['Export', 'Plus', 'MagnifyingGlass']
        elif 'gap' in rel.lower(): icons_needed = ['Warning', 'Plus', 'MagnifyingGlass']
        elif 'hitl' in rel.lower() or 'hit' in rel.lower(): icons_needed = ['UserCircle', 'Plus', 'MagnifyingGlass']
        elif 'rbac' in rel.lower() or 'role' in rel.lower() or 'user' in rel.lower(): icons_needed = ['Lock', 'Plus', 'MagnifyingGlass']
        elif 'security' in rel.lower() or 'firewall' in rel.lower() or 'vuln' in rel.lower(): icons_needed = ['ShieldCheck', 'Plus', 'MagnifyingGlass']
        elif 'setting' in rel.lower(): icons_needed = ['Gear', 'Plus', 'MagnifyingGlass']
        elif 'notif' in rel.lower(): icons_needed = ['Bell', 'Plus', 'MagnifyingGlass']
        elif 'remed' in rel.lower(): icons_needed = ['Wrench', 'Plus', 'MagnifyingGlass']
        elif 'eval' in rel.lower(): icons_needed = ['ChartBar', 'Plus', 'MagnifyingGlass']
        elif 'ciso' in rel.lower() or 'compliance' in rel.lower(): icons_needed = ['ShieldCheck', 'Plus', 'MagnifyingGlass']
        elif 'proxy' in rel.lower(): icons_needed = ['Globe', 'Plus', 'MagnifyingGlass']
        else: icons_needed = ['SquaresFour', 'Plus', 'MagnifyingGlass']
        
        if icons_needed:
            icon_import = f"import {{ {', '.join(icons_needed)} }} from '@phosphor-icons/react';"
            # Insert at top after React import
            if "import React" in content:
                content = content.replace(
                    "import React",
                    f"{icon_import}\nimport React"
                )
            else:
                content = icon_import + '\n' + content
    
    # Replace old class patterns with design system tokens
    # bg-gray-*, bg-white -> bg-card / bg-background
    content = re.sub(r'className="bg-white\b', 'className="bg-card', content)
    content = re.sub(r'bg-gray-50\b', 'bg-muted', content)
    content = re.sub(r'bg-gray-100\b', 'bg-muted', content)
    content = re.sub(r'bg-gray-800\b', 'bg-card', content)
    content = re.sub(r'bg-gray-900\b', 'bg-background', content)
    content = re.sub(r'text-gray-500\b', 'text-muted-foreground', content)
    content = re.sub(r'text-gray-400\b', 'text-muted-foreground', content)
    content = re.sub(r'text-gray-600\b', 'text-muted-foreground', content)
    content = re.sub(r'text-gray-700\b', 'text-foreground', content)
    content = re.sub(r'text-gray-800\b', 'text-foreground', content)
    content = re.sub(r'text-gray-900\b', 'text-foreground', content)
    content = re.sub(r'text-white\b', 'text-foreground', content)
    content = re.sub(r'border-gray-200\b', 'border-border', content)
    content = re.sub(r'border-gray-700\b', 'border-border', content)
    content = re.sub(r'border-gray-300\b', 'border-border', content)
    content = re.sub(r'divide-gray-200\b', 'divide-border', content)
    content = re.sub(r'divide-gray-700\b', 'divide-border', content)
    content = re.sub(r'hover:bg-gray-50\b', 'hover:bg-muted/50', content)
    content = re.sub(r'hover:bg-gray-100\b', 'hover:bg-muted', content)
    content = re.sub(r'hover:bg-gray-700\b', 'hover:bg-muted', content)
    content = re.sub(r'rounded-lg\b', 'rounded-none', content)
    content = re.sub(r'rounded-xl\b', 'rounded-none', content)
    content = re.sub(r'rounded-md\b', 'rounded-none', content)
    content = re.sub(r'rounded-2xl\b', 'rounded-none', content)
    # Replace focus ring colors
    content = re.sub(r'focus:ring-blue-500\b', 'focus:ring-emerald-500', content)
    content = re.sub(r'focus:ring-indigo-500\b', 'focus:ring-emerald-500', content)
    # Replace accent blue -> emerald
    content = re.sub(r'bg-blue-600\b', 'bg-emerald-600', content)
    content = re.sub(r'bg-blue-500\b', 'bg-emerald-600', content)
    content = re.sub(r'hover:bg-blue-700\b', 'hover:bg-emerald-700', content)
    content = re.sub(r'text-blue-600\b', 'text-emerald-600', content)
    content = re.sub(r'text-blue-500\b', 'text-emerald-500', content)
    # Replace indigo -> emerald
    content = re.sub(r'bg-indigo-600\b', 'bg-emerald-600', content)
    content = re.sub(r'hover:bg-indigo-700\b', 'hover:bg-emerald-700', content)
    content = re.sub(r'text-indigo-600\b', 'text-emerald-600', content)
    
    if content != original:
        with open(fpath, 'w') as f:
            f.write(content)
        return True
    return False

# Process all pages
converted = 0
skipped = 0
for fpath in sorted(glob.glob(f'{base}/pages/**/*.tsx', recursive=True)):
    rel = os.path.relpath(fpath, base)
    try:
        if convert_page(fpath):
            converted += 1
            print(f'  [CONVERTED] {rel}')
        else:
            skipped += 1
    except Exception as e:
        print(f'  [ERROR] {rel}: {e}')

print(f'\nDone: {converted} converted, {skipped} already good')
