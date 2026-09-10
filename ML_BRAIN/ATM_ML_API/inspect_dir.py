import os
from pathlib import Path

target_dir = Path(r"C:\Users\yoges\OneDrive\Desktop\mltraining data")

print(f"Target directory exists: {target_dir.exists()}")
if target_dir.exists():
    items = list(target_dir.glob("*"))
    print(f"Total items found: {len(items)}")
    for item in items:
        if item.is_file():
            size_mb = item.stat().st_size / (1024 * 1024)
            print(f"File: {item.name} ({size_mb:.2f} MB)")
        elif item.is_dir():
            print(f"Dir:  {item.name}/")
else:
    print("Directory does not exist at path.")
