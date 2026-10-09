#!/usr/bin/env python3
"""Verify hand-typed SVG paths in SiteHeader against the capture."""
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parents[1]
cap = (ROOT / "docs/research/homepage/sections/header_nav.html").read_text(encoding="utf-8")
mine = (ROOT / "src/components/layout/SiteHeader.tsx").read_text(encoding="utf-8")

paths_cap = re.findall(r'<path d="([^"]+)"', cap)
paths_mine = re.findall(r'<path d="([^"]+)"', mine)
for p in paths_cap:
    if p in paths_mine:
        print(f"MATCH ({len(p)} chars): {p[:60]}...")
    else:
        print(f"DIFF capture: {p[:120]}")
        for mp in paths_mine:
            if mp.startswith(p[:20]):
                print(f"DIFF mine   : {mp[:120]}")
