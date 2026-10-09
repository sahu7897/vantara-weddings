#!/usr/bin/env python3
"""Audit: every local asset URL referenced by homepage pieces exists in public/."""
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parents[1]
SECTIONS = ROOT / "docs" / "research" / "homepage" / "sections"
PUBLIC = ROOT / "public"

ATTR_RE = re.compile(r'(?:src|poster|href|data-src)="([^"]+)"')
missing: dict[str, list[str]] = {}
total = 0
for f in sorted(SECTIONS.glob("*.html")):
    t = f.read_text(encoding="utf-8")
    for v in ATTR_RE.findall(t):
        v = v.split("#")[0]
        if v.startswith(("https://gcpimages.", "http://gcpimages.", "//gcpimages.")):
            v = re.sub(r"^(?:https?:)?//gcpimages\.theweddingcompany\.com", "/gcpimages", v)
        if not v.startswith("/"):
            continue
        if v.startswith("/_next/static/media/"):
            v = v.replace("/_next/static/media/", "/media/", 1)
        total += 1
        p = PUBLIC / v.lstrip("/")
        if not p.exists():
            missing.setdefault(v, []).append(f.name)

print(f"checked {total} local refs, {len(missing)} unique missing:")
for v, files in sorted(missing.items()):
    print(f"  {v}\n     <- {sorted(set(files))}")
