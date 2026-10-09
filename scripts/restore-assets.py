#!/usr/bin/env python3
"""
Stage 2 — restore original assets into the new project.

Sources (both READ-ONLY):
  1. Capture folder  : byte-perfect binaries (fonts/media/videos mirrored by capture)
  2. Live site/CDN   : anything missing or corrupted in the capture (approved: D6)

Scope (Stage 2):
  - gcpimages CDN media (hero videos, posters) -> public/gcpimages/...
  - all site-relative assets referenced by captured + crawled HTML
    (/_next/static/media, /images, root svgs/webp, favicon, inline url())
    -> public/<same path>, EXCEPT /_next/static/media/* -> /media/*
    (Next.js forbids public/_next — see dest_for())
  - Moisette custom font (@font-face from original compiled CSS)
Everything mirrors the ORIGINAL URL paths so captured markup can be reused
with unchanged src paths.

Deferred (noted in report):
  - imageswedding.theweddingcompany.com gallery photos -> Stage 5 (come from API)
  - cdn.prod.website-files.com (7 Webflow pages)       -> Stage 10 webflow pass

Writes docs/research/asset_restore_report.json
"""
from __future__ import annotations

# PHASE 5 GUARD (docs/BLUEPRINT.md → "Phase 5"): this script downloads assets
# from the live theweddingcompany.com site, which is prohibited from Phase 5
# onward. Kept for provenance only — must not be run.
raise SystemExit("BLOCKED (Phase 5): downloads from the live TWC site are prohibited.")

import json
import pathlib
import re
import sys
import time
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
CAPTURE = pathlib.Path(r"C:\Users\MODI\OneDrive\Desktop\vantaraweddings_webapp\www.theweddingcompany.com")
SITE_CAPTURE = CAPTURE / "www.theweddingcompany.com"
GCP_CAPTURE = CAPTURE / "gcpimages.theweddingcompany.com"
RESEARCH = pathlib.Path(r"C:\Users\MODI\AppData\Local\Temp\opencode\twc_research")
LIVE = "https://www.theweddingcompany.com"
PUBLIC = ROOT / "public"
REPORT = ROOT / "docs" / "research" / "asset_restore_report.json"

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"

MAGIC_OK = {
    ".woff2": lambda b: b[:4] == b"wOF2",
    ".woff": lambda b: b[:4] == b"wOFF",
    ".ttf": lambda b: b[:4] in (b"\x00\x01\x00\x00", b"OTTO", b"true"),
    ".webp": lambda b: b[:4] == b"RIFF" and b[8:12] == b"WEBP",
    ".png": lambda b: b[:8] == b"\x89PNG\r\n\x1a\n",
    ".jpg": lambda b: b[:3] == b"\xff\xd8\xff",
    ".jpeg": lambda b: b[:3] == b"\xff\xd8\xff",
    ".gif": lambda b: b[:6] in (b"GIF87a", b"GIF89a"),
    ".svg": lambda b: b.lstrip()[:4] == b"<svg" or b.lstrip()[:5] == b"<?xml",
    ".ico": lambda b: b[:4] == b"\x00\x00\x01\x00",
    ".mp4": lambda b: b[4:8] == b"ftyp",
}


def valid(path: pathlib.Path) -> bool:
    if not path.exists() or path.stat().st_size == 0:
        return False
    checker = MAGIC_OK.get(path.suffix.lower())
    if not checker:
        return True
    with open(path, "rb") as fh:
        return checker(fh.read(16))


def download(url: str, dest: pathlib.Path) -> bool:
    dest.parent.mkdir(parents=True, exist_ok=True)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=90) as r:
            data = r.read()
        tmp = dest.with_suffix(dest.suffix + ".part")
        tmp.write_bytes(data)
        if not valid(tmp):
            tmp.unlink(missing_ok=True)
            print(f"  invalid bytes {url}")
            return False
        tmp.replace(dest)
        return True
    except Exception as e:  # noqa: BLE001
        print(f"  dl fail {url}: {e}")
        return False


def html_files() -> list[pathlib.Path]:
    files = sorted(SITE_CAPTURE.rglob("*.html"))
    if (RESEARCH / "raw").exists():
        files += sorted((RESEARCH / "raw").glob("*.html"))
    return files


def dest_for(rel: str) -> pathlib.Path:
    """Map original URL path -> project path.

    Next.js FORBIDS a public/_next folder (conflicts with the internal /_next
    route), so /_next/static/media/* is remapped to /media/*; everything else
    mirrors the original path exactly. Use /media/<name> in markup.
    """
    if rel.startswith("/_next/static/media/"):
        return PUBLIC / "media" / rel[len("/_next/static/media/") :]
    return PUBLIC / rel.lstrip("/")


def collect_refs() -> tuple[set[str], set[str]]:
    """(site-relative refs, absolute gcpimages refs) from all HTML."""
    site_refs: set[str] = set()
    gcp_refs: set[str] = set()
    pat_site = re.compile(
        r'(?:src|href|poster)="(/(?:_next/static|images|fonts|logo|favicon|flowerbg|sparkle|arrows)[^"]+?\.(?:webp|png|jpe?g|gif|svg|ico|woff2?|ttf|mp4))"'
    )
    # inline CSS / JSX arbitrary values: url(/flowerbg.webp), url("/x.svg")
    pat_cssurl = re.compile(r"""url\((["']?)(/[^)"'#]+?\.(?:webp|png|jpe?g|gif|svg))\1\)""")
    pat_gcp = re.compile(r"https://gcpimages\.theweddingcompany\.com/([^\s\"'<>\\)]+?\.(?:mp4|webp|jpe?g|png|gif|svg))")
    for f in html_files():
        try:
            text = f.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        for ref in pat_site.findall(text):
            site_refs.add(ref.split("?")[0].split("#")[0])
        for ref in pat_cssurl.findall(text):
            site_refs.add(ref[1].split("?")[0].split("#")[0])
        for path in pat_gcp.findall(text):
            gcp_refs.add(path.split("?")[0].split("#")[0])
    # known root assets that live only inside JSX chunks (not HTML attrs)
    for name in ("flowerbg.webp", "sparkle.svg", "arrows_more_down.svg"):
        site_refs.add("/" + name)
    return site_refs, gcp_refs


def from_capture(rel: str, dest: pathlib.Path) -> str:
    """Copy from capture; fall back to live download if missing/corrupt.
    Provenance is source-based: 'capture' = byte-perfect capture copy,
    'live' = sourced from the live site. Existing dests skip the network."""
    src = SITE_CAPTURE / rel.lstrip("/")
    if src.exists():
        dest.parent.mkdir(parents=True, exist_ok=True)
        if not dest.exists():
            dest.write_bytes(src.read_bytes())
        if valid(dest):
            return "capture"
        # capture copy corrupt -> fall through to live
    if dest.exists() and valid(dest):
        return "live"  # restored by a previous run
    if download(LIVE + rel, dest):
        return "live"
    return "MISSING"


def main() -> int:
    report: dict[str, str] = {}

    # 1) gcpimages media — captured mirror first (byte-perfect), then live CDN
    if GCP_CAPTURE.exists():
        for f in sorted(GCP_CAPTURE.rglob("*")):
            if not f.is_file():
                continue
            rel = f.relative_to(GCP_CAPTURE)
            dest = PUBLIC / "gcpimages" / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            if not dest.exists():
                dest.write_bytes(f.read_bytes())
            status = "capture" if valid(dest) else "INVALID"
            if status != "capture":
                status = "live" if download(f"https://gcpimages.theweddingcompany.com/{rel.as_posix()}", dest) else "MISSING"
            report[f"https://gcpimages.theweddingcompany.com/{rel.as_posix()}"] = status

    # 2) every referenced asset: capture copy -> live download
    site_refs, gcp_refs = collect_refs()
    print(f"site-relative refs: {len(site_refs)} | gcpimages refs: {len(gcp_refs)}")

    for rel in sorted(site_refs):
        if rel in report:
            continue
        report[rel] = from_capture(rel, dest_for(rel))
        print(f"  [{report[rel]}] {rel}")
        time.sleep(0.05)

    for path in sorted(gcp_refs):
        key = f"https://gcpimages.theweddingcompany.com/{path}"
        if key in report:
            continue
        dest = PUBLIC / "gcpimages" / path
        if dest.exists() and valid(dest):
            report[key] = "live"  # downloaded by a previous run
            continue
        report[key] = "live" if download(key, dest) else "MISSING"
        print(f"  [{report[key]}] {key}")
        time.sleep(0.05)

    # 3) Moisette custom font — map from original compiled CSS @font-face
    css = SITE_CAPTURE / "_next" / "static" / "css" / "12807397349bb01c.css"
    if css.exists():
        text = css.read_text(encoding="utf-8", errors="ignore")
        pat = re.compile(
            r"@font-face\{font-family:(__?moisette[^;}]*)[^}]*?src:url\((/_next/static/media/[^)]+)\)[^}]*?font-weight:(\d+)",
            re.IGNORECASE,
        )
        seen: set[str] = set()
        for m in pat.finditer(text):
            fam, url, weight = m.group(1), m.group(2), m.group(3)
            if url in seen:
                continue
            seen.add(url)
            dest = dest_for(url)
            status = from_capture(url, dest)
            report[f"moisette w{weight} ({fam})"] = f"{status} -> {url}"
            print(f"  [moisette w{weight} {status}] {url}")
        if not seen:
            report["moisette"] = "NOT FOUND in original CSS"

    # 4) original favicon kept as reference only (Vantara uses brand/ placeholder)
    for name in ("favicon_new.ico", "favicon.ico"):
        ico = SITE_CAPTURE / name
        if ico.exists():
            dest = PUBLIC / "_meta" / "original-favicon.ico"
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(ico.read_bytes())
            report[name] = "capture(ref only)"
            break

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(report, indent=1), encoding="utf-8")

    missing = [k for k, v in report.items() if v == "MISSING"]
    print(f"\nrestored={sum(1 for v in report.values() if v != 'MISSING')} missing={len(missing)} -> {REPORT}")
    for k in missing:
        print(f"  MISSING {k}")

    # deferred scopes, recorded for later stages
    notes = {
        "deferred": [
            "imageswedding.theweddingcompany.com gallery photos -> Stage 5 (image URLs come from API)",
            "cdn.prod.website-files.com (Webflow: wedding-portfolio, wedding-invitation-card, success-stories, careers, privacy x2, safety-guideline) -> Stage 10",
            "third-party widgets (tagembed/taggbox/clarity/mixpanel/posthog) -> hotlink embeds, activation per D7",
        ]
    }
    REPORT.with_name("asset_restore_notes.json").write_text(json.dumps(notes, indent=1), encoding="utf-8")
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main())
