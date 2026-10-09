#!/usr/bin/env python3
"""Inventory URL hosts + brand-string occurrences across extracted pieces."""
import re
import sys
from collections import Counter
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
d = Path(__file__).resolve().parents[1] / "docs" / "research" / "homepage" / "sections"

hosts: Counter[str] = Counter()
patterns: Counter[str] = Counter()
brand: Counter[str] = Counter()
internal_links: Counter[str] = Counter()

ATTR_RE = re.compile(r'(?:href|src|srcSet|poster|content|data-src)="([^"]+)"')

for f in sorted(d.glob("*.html")):
    t = f.read_text(encoding="utf-8")
    for v in ATTR_RE.findall(t):
        if v.startswith("http"):
            h = re.match(r"(https?:)?//([^/]+)", v)
            if h:
                hosts[h.group(2)] += 1
        elif v.startswith("/"):
            internal_links[v.split("?")[0]] += 1
    for pat, label in [
        (r"The Wedding Company", "The Wedding Company"),
        (r"theweddingcompany\.com", "theweddingcompany.com"),
        (r"Betterhalf", "Betterhalf"),
        (r"betterhalf", "betterhalf-lower"),
        (r"8884090499|9538376029", "phone-numbers"),
        (r"support@", "support-email"),
    ]:
        c = len(re.findall(pat, t))
        if c:
            brand[label] += c
    for pat, label in [
        (r'/_next/static/media/', "_next/static/media refs"),
        (r"tagembed", "tagembed"),
        (r"keen-slider", "keen-slider"),
        (r"<video", "<video>"),
        (r'fetchpriority|fetchPriority', "fetchpriority"),
    ]:
        c = len(re.findall(pat, t))
        if c:
            patterns[label] += c

print("HOSTS:")
for k, v in hosts.most_common():
    print(f"  {v:5}  {k}")
print("PATTERNS:")
for k, v in patterns.most_common():
    print(f"  {v:5}  {k}")
print("BRAND:")
for k, v in brand.most_common():
    print(f"  {v:5}  {k}")
print("INTERNAL LINKS (unique: %d):" % len(internal_links))
for k, v in internal_links.most_common(40):
    print(f"  {v:5}  {k}")
