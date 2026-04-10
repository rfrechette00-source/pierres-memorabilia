#!/usr/bin/env python3
"""
Verify that all image/COA/correspondence paths referenced in index.html
actually exist on disk. Exits 1 if any are missing.
"""
import re
import sys
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).parent.parent.parent  # repo root
HTML = ROOT / "index.html"

if not HTML.exists():
    print("ERROR: index.html not found", file=sys.stderr)
    sys.exit(1)

content = HTML.read_text(encoding="utf-8")

# Collect all relative file paths from src= and data-coa/licensed/correspondence=
patterns = [
    r'src="(Pierre[^"]+)"',
    r'data-coa="([^"]+)"',
    r'data-licensed="([^"]+)"',
    r'data-correspondence="([^"]+)"',
    r'data-highres="(Pierre[^"]+)"',
]

missing = []
checked = 0

for pat in patterns:
    for encoded_path in re.findall(pat, content):
        path = unquote(encoded_path)
        full = ROOT / path
        checked += 1
        if not full.exists():
            missing.append(path)

if missing:
    print(f"FAIL: {len(missing)} missing file(s):")
    for m in missing:
        print(f"  ✗ {m}")
    sys.exit(1)
else:
    print(f"OK: all {checked} referenced files exist on disk.")
