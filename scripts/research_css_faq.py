#!/usr/bin/env python3
"""(A) Which CSS files does captured homepage load + extract custom rules
(BookVenueSection mask etc). (B) FAQ accordion panel structure in capture."""
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
CAP = Path(
    r"C:\Users\MODI\OneDrive\Desktop\vantaraweddings_webapp\www.theweddingcompany.com"
    r"\www.theweddingcompany.com"
)
INDEX = CAP / "index.html"
SECTIONS = Path(
    r"C:\Users\MODI\OneDrive\Desktop\vantaraweddings_webapp\vantara-weddings"
    r"\docs\research\homepage\sections"
)

print("=== homepage stylesheet links ===")
head = INDEX.read_text(encoding="utf-8", errors="ignore")
head = head[: head.find("</head>")]
for m in re.finditer(r'<link[^>]*rel="stylesheet"[^>]*>', head):
    print("  ", m.group(0)[:200])

print("\n=== all capture css files ===")
for f in sorted((CAP / "_next" / "static" / "css").rglob("*.css")):
    print("  ", f.relative_to(CAP), f.stat().st_size)

print("\n=== BookVenueSection_mask rule (from page css) ===")
for f in sorted((CAP / "_next" / "static" / "css").rglob("*.css")):
    t = f.read_text(encoding="utf-8", errors="ignore")
    for m in re.finditer(r"([^{}]*BookVenueSection_mask[^{}]*)\{([^{}]*)\}", t):
        print(f"  [{f.name}] {m.group(1).strip()} {{ {m.group(2).strip()} }}")

print("\n=== FAQ accordion structure (first item) ===")
faq = (SECTIONS / "frequently_asked_questions_section.html").read_text(encoding="utf-8")
i = faq.find("szh-accordion__item ")
seg = faq[i : i + 3000]
# print compactly
print(re.sub(r"\s+", " ", seg)[:2600])

print("\n=== does capture contain item-content/panel? ===")
for kw in ["item-content", "item-panel", "item-heading", "status-exited", "status-entering"]:
    print(f"  {kw}: {faq.count(kw)}")

print("\n=== maskFaded usage ===")
for f in SECTIONS.glob("*.html"):
    t = f.read_text(encoding="utf-8")
    if "maskFaded" in t:
        m = re.search(r'<[^>]*maskFaded[^>]*>', t)
        print(f"  {f.name}: {m.group(0)[:240] if m else ''}")
