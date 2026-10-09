#!/usr/bin/env python3
"""Print exact divergence point of the chevron path."""
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parents[1]
cap = (ROOT / "docs/research/homepage/sections/header_nav.html").read_text(encoding="utf-8")
mine = (ROOT / "src/components/layout/SiteHeader.tsx").read_text(encoding="utf-8")
a = re.findall(r'<path d="(M9\.125[^"]+)"', cap)[0]
b = re.findall(r'<path d="(M9\.125[^"]+)"', mine)[0]
i = 0
while i < min(len(a), len(b)) and a[i] == b[i]:
    i += 1
print(f"diverge at {i}/{len(a)} vs {len(b)}")
print("capture: ..." + a[max(0, i - 30) : i + 60])
print("mine   : ..." + b[max(0, i - 30) : i + 60])
print("capture tail:", a[-80:])
print("mine tail   :", b[-80:])
