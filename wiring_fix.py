#!/usr/bin/env python3
"""Wiring fix: surgical patches for 7 gaps in 4 files."""
import re

def patch(fp, replacements):
    with open(fp) as f:
        content = f.read()
    for old, new in replacements:
        if old not in content:
            print(f'  WARNING: pattern not found in {fp}: {old[:60]}...')
            continue
        content = content.replace(old, new, 1)
    with open(fp, 'w') as f:
        f.write(content)
    print(f'  patched {fp}')

print('=== GAP-1 & GAP-2: sentinel/proxy.py ===')
# Read the file to understand the exact patterns
with open('sentinel/proxy.py') as f:
    proxy = f.read()