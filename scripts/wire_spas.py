"""Wire the two embedded SPA apps (integrity-program, twc-exclusive) into
public/: brand swaps in bundles, Vantara logo substitutions, missing assets."""
# PHASE 5 GUARD (docs/BLUEPRINT.md → "Phase 5"): this script downloads assets
# from the live theweddingcompany.com site, which is prohibited from Phase 5
# onward. Kept for provenance only — must not be run.
raise SystemExit("BLOCKED (Phase 5): downloads from the live TWC site are prohibited.")
import sys, re, pathlib, urllib.request, ssl
from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")
ROOT = pathlib.Path(r"C:\Users\MODI\OneDrive\Desktop\vantaraweddings_webapp\vantara-weddings")
PUBLIC = ROOT / "public"
LOGO = PUBLIC / "brand" / "vantara-logo.png"
ctx = ssl.create_default_context()
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36"}

# ---- 1) brand string swaps in JS bundles -----------------------------------
for rel in [
    "twc-exclusive/assets/index-B460GC4S.js",
    "integrity-program/assets/index-Cod5_Iaw.js",
    "integrity-program/assets/routes-CHpH3WOd.js",
]:
    p = PUBLIC / rel
    t = p.read_text(encoding="utf-8", errors="ignore")
    before = (t.count("The Wedding Company"), len(re.findall(r"\bTWC\b", t)))
    t = t.replace("The Wedding Company", "Vantara")
    t = re.sub(r"\bTWC\b", "Vantara", t)
    p.write_text(t, encoding="utf-8")
    print(f"swapped {rel}: TheWeddingCompany={before[0]} TWC={before[1]}")

# ---- 2) Vantara logo standing in for the TWC logo referenced by the apps ---
def put_logo(dest: pathlib.Path, fmt: str | None = None):
    dest.parent.mkdir(parents=True, exist_ok=True)
    im = Image.open(LOGO).convert("RGBA")
    if fmt is None:
        fmt = dest.suffix.lstrip(".").upper()
    if fmt == "WEBP":
        im.save(dest, "WEBP", quality=90)
    elif fmt == "PNG":
        im.save(dest, "PNG", optimize=True)
    else:  # ICO-ish sources: png content at png path
        im.save(dest, "PNG", optimize=True)
    print(f"logo -> {dest.relative_to(PUBLIC)} ({dest.stat().st_size}B)")


# integrity app references this path (live404s; we serve the Vantara logo)
put_logo(PUBLIC / "__l5e/assets-v1/00223961-ce52-47d5-883b-5b9e1d8725a7/twc-logo.png")

# deals app logo images (header logo + maroon/yellow variants)
put_logo(PUBLIC / "twc-exclusive/assets/twc-logo-Y_F3trG8.webp", "WEBP")
put_logo(PUBLIC / "twc-exclusive/assets/twc-maroon-C4xVF_S2.png")
put_logo(PUBLIC / "twc-exclusive/assets/twc-yellow-uSs339__.png")

# ---- 3) remaining integrity assets ----------------------------------------
for path in [
    "/__l5e/assets-v1/0277f841-11ec-4474-a1e4-1938ba78a5fd/confidential-stamp.png",
]:
    dest = PUBLIC / path.lstrip("/")
    if dest.exists() and dest.stat().st_size > 1000:
        print("skip", path)
        continue
    try:
        req = urllib.request.Request("https://www.theweddingcompany.com" + path, headers=UA)
        data = urllib.request.urlopen(req, timeout=45, context=ctx).read()
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
        print(f"fetched {path} ({len(data)}B)")
    except Exception as e:
        print(f"ERR {path}: {e}")

# ---- 4) any other asset refs in the bundles we missed ----------------------
for rel in ["integrity-program/assets/routes-CHpH3WOd.js", "integrity-program/assets/index-Cod5_Iaw.js"]:
    t = (PUBLIC / rel).read_text(encoding="utf-8", errors="ignore")
    refs = set(re.findall(r"`(/__l5e/assets-v1/[^`]+)`", t))
    refs |= set(re.findall(r'"(/__l5e/assets-v1/[^"]+)"', t))
    refs |= set(re.findall(r"`(/integrity-program/assets/[^`]+)`", t))
    for r in refs:
        dest = PUBLIC / r.lstrip("/")
        if not dest.exists():
            print("STILL MISSING asset ref:", r)
print("done")
