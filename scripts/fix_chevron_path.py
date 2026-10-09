#!/usr/bin/env python3
"""Replace the hand-typed chevron path in SiteHeader with the capture's exact path."""
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parents[1]
cap = (ROOT / "docs/research/homepage/sections/header_nav.html").read_text(encoding="utf-8")
f = ROOT / "src/components/layout/SiteHeader.tsx"
mine = f.read_text(encoding="utf-8")
pat = r'<path d="(M9\.125[^"]+)"'
a = re.findall(pat, cap)[0]
b = re.findall(pat, mine)[0]
f.write_text(mine.replace(b, a), encoding="utf-8")
print(f"replaced len {len(b)} -> {len(a)}")
