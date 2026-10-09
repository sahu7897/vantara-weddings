#!/usr/bin/env python3
"""Print raw bytes at piece boundaries + all <main> positions (Stage 3a diagnosis)."""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import extract_homepage as E

html = E.SRC.read_text(encoding="utf-8", errors="ignore")
spans, cur = {}, 0
for sid in E.SECTIONS:
    sp = E.find_element(html, sid, cur)
    if sp:
        spans[sid] = sp
        cur = sp[1]


def region(a: int, b: int, label: str) -> None:
    print(f"--- {label} [{a},{b}] len={b - a}:")
    chunk = html[a:b]
    print(repr(chunk[:300]))
    if b - a > 300:
        print("   ...end:", repr(chunk[-300:]))
    print()


print("main opens :", [(m.start(), m.group(0)[:70]) for m in re.finditer(r"<main[^>]*>", html)])
print("main closes:", [m.start() for m in re.finditer(r"</main>", html)])
print()
pc = re.search(r'<div[^>]*id="parent-container"[^>]*>', html)
if pc:
    region(pc.end(), spans["home-page-revamp"][0], "header slice")
region(
    spans["book_venues_section"][1],
    spans["venues_in_different_cities_section"][0],
    "book->venues gap",
)
region(
    spans["venues_in_different_cities_section"][1],
    spans["industry_partners_section"][0],
    "venues->industry gap",
)
region(
    spans["industry_partners_section"][1],
    spans["end_to_end_services_section"][0],
    "industry->e2e gap",
)
region(
    spans["end_to_end_services_section"][1],
    spans["wedding_proposals_section"][0],
    "e2e->proposals gap",
)
