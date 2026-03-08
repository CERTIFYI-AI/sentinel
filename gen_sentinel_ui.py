import os

BASE = "dashboard/src"

def w(path, content):
    fp = os.path.join(BASE, path) if not path.startswith("dashboard") else path
    os.makedirs(os.path.dirname(fp), exist_ok=True)
    with open(fp, "w") as f:
        f.write(content)
    print(f"  wrote {fp}")

print("=== Certifyi Sentinel Full UI Build ===")
print("Generating 47 files...")

# FILE 1/47: index.css - Design System Foundation
print("\n[1/47] index.css")
w("index.css", r"""
