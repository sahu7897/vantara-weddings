#!/usr/bin/env python3
"""Check gcpimages media referenced by pieces vs files in public/gcpimages."""
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parents[1]
SECTIONS = ROOT / "docs" / "research" / "homepage" / "sections"
PUBLIC = ROOT / "public"

refs = set()
for f in SECTIONS.glob("*.html"):
    for m in re.finditer(r"https?://gcpimages\.theweddingcompany\.com(/[^\s\"']+\.(?:mp4|webp|jpg|png|gif|svg))", f.read_text(encoding="utf-8")):
        refs.add(m.group(1))
    for m in re.finditer(r"src=\"/gcpimages(/[^\s\"']+\.(?:mp4|webp|jpg|png|gif|svg))", f.read_text(encoding="utf-8")):
        refs.add(m.group(1))

missing = [r for r in sorted(refs) if not (PUBLIC / "gcpimages" / r.lstrip("/")).exists()]
print(f"{len(refs)} gcpimages refs, {len(missing)} missing:")
for r in missing:
    print("  MISSING", r)
assets = PUBLIC / "gcpimages" / "weddings" / "assets"
if assets.exists():
    files = list(assets.glob("*"))
    print(f"\npublic/gcpimages/weddings/assets: {len(files)} files")
    for p in sorted(files)[:40]:
        print("  ", p.name, p.stat().st_size)
else:
    print("\nNO assets dir at", assets)
