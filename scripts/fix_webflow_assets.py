"""Fix webflow asset fetch leftovers:
1. CSS was saved at webflow/img/css/css/<file> — rewrite rule serves
   webflow/img/css/<file>, so move it up one level.
2. The10 failures were URL-truncated at ')' (filename parens). Re-extract
   with QUOTED-attr parsing and download what's missing.
"""
from __future__ import annotations

# PHASE 5 GUARD (docs/BLUEPRINT.md → "Phase 5"): this script downloads assets
# from the live theweddingcompany.com site, which is prohibited from Phase 5
# onward. Kept for provenance only — must not be run.
raise SystemExit("BLOCKED (Phase 5): downloads from the live TWC site are prohibited.")

import pathlib
import re
import shutil
import ssl
import sys
import urllib.parse
import urllib.request

sys.stdout.reconfigure(encoding="utf-8")

RAW = pathlib.Path(r"C:\Users\MODI\AppData\Local\Temp\opencode\twc_research\raw")
DEST = pathlib.Path(r"C:\Users\MODI\OneDrive\Desktop\vantaraweddings_webapp\vantara-weddings\public")
CTX = ssl.create_default_context()
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36"}
SKIP_NAMES = ("favicon-twc", "pink_horizontal_4x", "256x256_1x")

# 1) css move
css_dir = DEST / "webflow" / "img" / "css"
nested = css_dir / "css"
if nested.exists():
    for f in nested.iterdir():
        target = css_dir / f.name
        if not target.exists():
            shutil.move(str(f), str(target))
            print("moved", target.name)
    shutil.rmtree(nested, ignore_errors=True)
    print("css dir normalized")
for f in css_dir.iterdir() if css_dir.exists() else []:
    print("  css:", f.name, f.stat().st_size)


def local_path_for(url: str) -> pathlib.Path | None:
    m = re.match(r"https?://(?:cdn\.prod\.)?website-files\.com/[0-9a-f]+/(.+)$", url.split("?")[0])
    if not m:
        return None
    rest = m.group(1)
    if any(s in rest for s in SKIP_NAMES):
        return None
    return DEST / "webflow" / "img" / pathlib.PurePosixPath(urllib.parse.unquote(rest))


# 2) re-extract with quoted parsing (allows ')' in filenames)
urls: set[str] = set()
pats = [
    r'\ssrc="([^"]+)"',
    r'\shref="([^"]+)"',
    r'\sposter="([^"]+)"',
    r'srcset="([^"]+)"',
]
for p in RAW.glob("*.html"):
    h = p.read_text(encoding="utf-8", errors="ignore")
    if "website-files.com" not in h:
        continue
    for pat in pats:
        for m in re.finditer(pat, h):
            val = m.group(1)
            if "srcset=" in pat:
                for part in val.split(","):
                    u = part.strip().split(" ")[0]
                    if "website-files.com" in u:
                        urls.add(u)
            elif "website-files.com" in val:
                urls.add(val)

css_file = next(iter(css_dir.glob("*.css")), None) if css_dir.exists() else None
if css_file:
    css = css_file.read_text(encoding="utf-8", errors="ignore")
    for m in re.finditer(r'url\(\s*"([^"]+)"\s*\)', css):
        if "website-files.com" in m.group(1):
            urls.add(m.group(1))

todo = []
for u in sorted(urls):
    p = local_path_for(u)
    if p is None:
        continue
    if not p.exists() or p.stat().st_size == 0:
        todo.append(u)
print(f"quoted-extract urls={len(urls)} missing={len(todo)}")

ok = fail = 0
for u in todo:
    p = local_path_for(u)
    try:
        req = urllib.request.Request(u, headers=UA)
        data = urllib.request.urlopen(req, timeout=60, context=CTX).read()
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(data)
        ok += 1
    except Exception as e:  # noqa: BLE001
        fail += 1
        print("FAIL", u, "->", e)
print(f"fetched ok={ok} fail={fail}")
