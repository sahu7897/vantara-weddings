#!/usr/bin/env python3
"""Extract from original build: (1) keen-slider instantiations + options,
(2) custom CSS classes used by homepage pieces (.szh-accordion, .maskFaded, ...)
from the original compiled stylesheet, (3) video tag attributes."""
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
CHUNKS = Path(r"C:\Users\MODI\AppData\Local\Temp\opencode\twc_research\live_build\chunks")
CSS = Path(
    r"C:\Users\MODI\OneDrive\Desktop\vantaraweddings_webapp\www.theweddingcompany.com"
    r"\www.theweddingcompany.com\_next\static\css\12807397349bb01c.css"
)
SECTIONS = Path(
    r"C:\Users\MODI\OneDrive\Desktop\vantaraweddings_webapp\vantara-weddings"
    r"\docs\research\homepage\sections"
)

print("========== 1. keen-slider JSX instantiations ==========")
pat = re.compile(r'className:"keen-slider[^"]*"')
for f in sorted(CHUNKS.glob("*.js")):
    t = f.read_text(encoding="utf-8", errors="ignore")
    for m in pat.finditer(t):
        s = max(0, m.start() - 1000)
        ctx = t[s : m.start() + 500]
        # find nearest options-ish object before the render
        opts = re.findall(r"\{[^{}]*(?:perView|loop|breakpoints|slides:|drag|mode:)[^{}]*\}", ctx)
        print(f"--- {f.name} @{m.start()}")
        print("   render:", m.group(0)[:200])
        for o in opts[-3:]:
            print("   opts?  :", o[:400])
        # also capture animation/interval hints
        for kw in ("autoPlay", "autoplay", "setInterval", "scrollBy", "prev:", "next:"):
            i = ctx.rfind(kw)
            if i >= 0:
                print(f"   kw {kw}: ...{ctx[i:i + 160]}")

print("\n========== 2. custom CSS selectors in homepage pieces ==========")
# all class names used in pieces
used: set[str] = set()
for f in SECTIONS.glob("*.html"):
    for m in re.finditer(r'class="([^"]+)"', f.read_text(encoding="utf-8")):
        for c in m.group(1).split():
            used.add(c)
# keep non-tailwind-looking (custom) candidates: lowercase, no :, no [, not known utility-ish
custom = sorted(
    c
    for c in used
    if re.match(r"^[a-zA-Z][a-zA-Z0-9_-]*$", c)
    and ":" not in c
    and c
    not in {"lg", "md", "sm", "xl", "hover", "focus", "active", "disabled"}
)
css_text = CSS.read_text(encoding="utf-8", errors="ignore") if CSS.exists() else ""
print(f"candidate classes: {len(custom)}")
defined_in_orig = []
missing = []
for c in custom:
    # class defined as a rule in original css?
    if re.search(rf"(?<![\w-])\.{re.escape(c)}(?![\w-])", css_text):
        defined_in_orig.append(c)
    else:
        missing.append(c)
print(f"\nDEFINED in original CSS ({len(defined_in_orig)}):")
for c in defined_in_orig:
    print("   ", c)
print(f"\nNOT defined in original CSS (tailwind utilities or unknown) ({len(missing)}):")
print("   ", ", ".join(missing))

print("\n========== 3. rules for key custom classes ==========")
for c in ["szh-accordion", "maskFaded", "keen-slider", "Toastify", "tagembed"]:
    for m in re.finditer(rf"([^{{}}]*\.{re.escape(c)}[^{{}}]*)\{{([^}}]*)\}}", css_text):
        sel = m.group(1).strip()
        if len(sel) > 300:
            continue
        print(f"{sel} {{ {m.group(2)[:400]} }}")

print("\n========== 4. video tags in pieces ==========")
for f in sorted(SECTIONS.glob("*.html")):
    t = f.read_text(encoding="utf-8")
    for m in re.finditer(r"<video[^>]*>", t):
        print(f"{f.name}: {m.group(0)[:300]}")
    for m in re.finditer(r"<source[^>]*>", t):
        print(f"{f.name}:   src: {m.group(0)[:200]}")
