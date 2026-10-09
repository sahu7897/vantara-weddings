#!/usr/bin/env python3
"""List keen-slider container/slide class lists per homepage piece."""
import re
import sys
from collections import Counter
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
d = Path(__file__).resolve().parents[1] / "docs" / "research" / "homepage" / "sections"
for f in sorted(d.glob("*.html")):
    t = f.read_text(encoding="utf-8")
    cs = re.findall(r'class="(keen-slider[^"]*)"', t)
    if cs:
        print("==", f.name)
        for c, n in Counter(cs).most_common():
            print(f"  {n}x {c}")
