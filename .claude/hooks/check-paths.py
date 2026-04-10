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

try:
    content = HTML.read_text(encoding="utf-8")
except FileNotFoundError:
    print("ERROR: index.html not found", file=sys.stderr)
    sys.exit(1)

patterns = [
    r'src="(Pierre[^"]+)"',
    r'data-highres="(Pierre[^"]+)"',
    r'data-coa="([^"]+)"',
    r'data-licensed="([^"]+)"',
    r'data-correspondence="([^"]+)"',
]

paths = set()
for pat in patterns:
    for encoded_path in re.findall(pat, content):
        paths.add(unquote(encoded_path))

missing = [p for p in paths if not (ROOT / p).exists()]

if missing:
    print(f"FAIL: {len(missing)} missing file(s):")
    for m in sorted(missing):
        print(f"  ✗ {m}")
    sys.exit(1)
else:
    print(f"OK: all {len(paths)} referenced files exist on disk.")
