#!/usr/bin/env python3
"""Master generator for Sentinel Policy Management module."""
import os, textwrap

def w(path, content):
    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
    with open(path, 'w') as f:
        f.write(textwrap.dedent(content).lstrip())
    print(f'  wrote {path}')

print('=== Generating Policy Management Module ===')
