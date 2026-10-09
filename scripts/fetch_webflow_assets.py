"""Stage 4 — download Webflow-page assets (approved restore from live site).

Assets for the 8 cdn.prod.website-files.com pages:
  * shared CSS  -> public/webflow/img/css/<file>  (internal url() refs rewritten + fetched)
  * webflow JS + jquery -> public/webflow/js/<file>
  * all body images/srcset/href assets -> public/webflow/img/<siteid-rest>
URL convention matches html2tsx.rewrite_url: any website-files URL becomes
/webflow/img/<path-after-site-id>. TWC logo files are NOT downloaded (pages get
the official Vantara logo instead via build_webflow_pages.py preprocessing).
"""
from __future__ import annotations

# PHASE 5 GUARD (docs/BLUEPRINT.md → "Phase 5"): this script downloads assets
# from the live theweddingcompany.com site, which is prohibited from Phase 5
# onward. Kept for provenance only — must not be run.
raise SystemExit("BLOCKED (Phase 5): downloads from the live TWC site are prohibited.")

import concurrent.futures as cf
import pathlib
import re
import ssl
import sys
import urllib.parse
import urllib.request

sys.stdout.reconfigure(encoding="utf-8")

RAW = pathlib.Path(r"C:\Users\MODI\AppData\Local\Temp\opencode\twc_research\raw")
DEST = pathlib.Path(r"C:\Users\MODI\OneDrive\Desktop\vantaraweddings_webapp\vantara-weddings\public")
CTX = ssl.create_default_context()
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36"}
SITE_ID = "60222e72b5a2043efe117253"
CSS_URL = f"https://cdn.prod.website-files.com/{SITE_ID}/css/betterhalf-ai-landing-page.webflow.shared.6298b1d9e.css"

SKIP_NAMES = ("favicon-twc", "pink_horizontal_4x", "256x256_1x")  # brand: icons/logo handled centrally

WEBFLOW_PAGES = [
    "careers.html",
    "lp__partner-onboarding-form.html",
    "privacy-policy.html",
    "safety-guideline.html",
    "success-stories.html",
    "twc-privacy-policy.html",
    "wedding-invitation-card.html",
    "wedding-portfolio.html",
]

stats = {"ok": 0, "skip": 0, "fail": 0, "bytes": 0}
failures: list[str] = []


def local_path_for(url: str) -> pathlib.Path | None:
    """Map an absolute website-files URL to its local public/ path (or None to skip)."""
    m = re.match(
        r"https?://(?:cdn\.prod\.)?website-files\.com/[0-9a-f]+/(.+)$", url.split("?")[0]
    )
    if not m:
        return None
    rest = m.group(1)
    if any(s in rest for s in SKIP_NAMES):
        return None
    return DEST / "webflow" / "img" / pathlib.PurePosixPath(urllib.parse.unquote(rest))


def fetch_one(url: str) -> None:
    path = local_path_for(url)
    if path is None:
        return
    if path.exists() and path.stat().st_size > 0:
        stats["skip"] += 1
        return
    try:
        req = urllib.request.Request(url, headers=UA)
        data = urllib.request.urlopen(req, timeout=60, context=CTX).read()
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        stats["ok"] += 1
        stats["bytes"] += len(data)
    except Exception as e:  # noqa: BLE001
        stats["fail"] += 1
        failures.append(f"{url} -> {e}")


def download_js(urls: list[str]) -> None:
    for url in urls:
        name = urllib.parse.unquote(url.split("?")[0].rsplit("/", 1)[-1])
        dest = DEST / "webflow" / "js" / name
        if dest.exists() and dest.stat().st_size > 0:
            stats["skip"] += 1
            continue
        try:
            req = urllib.request.Request(url, headers=UA)
            data = urllib.request.urlopen(req, timeout=60, context=CTX).read()
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(data)
            stats["ok"] += 1
            stats["bytes"] += len(data)
        except Exception as e:  # noqa: BLE001
            stats["fail"] += 1
            failures.append(f"{url} -> {e}")


def main() -> int:
    urls: set[str] = set()
    js_urls: list[str] = []

    # 1) shared CSS (rewritten in place after download)
    css_path = DEST / "webflow" / "img" / "css" / CSS_URL.split(f"/{SITE_ID}/")[-1]
    if not css_path.exists():
        req = urllib.request.Request(CSS_URL, headers=UA)
        css = urllib.request.urlopen(req, timeout=60, context=CTX).read().decode("utf-8", "ignore")
        css_path.parent.mkdir(parents=True, exist_ok=True)
        css_path.write_text(css, encoding="utf-8")
        print(f"css saved ({len(css)}B) -> {css_path.relative_to(DEST)}")
    else:
        css = css_path.read_text(encoding="utf-8", errors="ignore")
        print("css cached")

    # 2) CSS internal url() refs (fonts/images; data: URIs skipped by host match)
    for ref in re.findall(r"url\(([^)]+)\)", css):
        ref = ref.strip("\"'")
        if ref.startswith("data:"):
            continue
        if "website-files.com" in ref:
            urls.add(ref)
    print(f"css url() refs to fetch: {len(urls)}")

    # 3) page assets
    for name in WEBFLOW_PAGES:
        h = (RAW / name).read_text(encoding="utf-8", errors="ignore")
        for m in re.finditer(r'https?://(?:cdn\.prod\.)?website-files\.com/[0-9a-f]+/[^\s"\',)]+', h):
            urls.add(m.group(0))
        # srcset entries end at spaces between url and width descriptor
        for m in re.finditer(r'srcset="([^"]+)"', h):
            for part in m.group(1).split(","):
                u = part.strip().split(" ")[0]
                if u.startswith("http") and "website-files.com" in u:
                    urls.add(u)
        for m in re.finditer(r'<script[^>]*src="([^"]+)"', h):
            s = m.group(1)
            if "webflow" in s or "jquery" in s:
                if s not in js_urls:
                    js_urls.append(s)

    print(f"total image/asset urls: {len(urls)}  js: {len(js_urls)}")
    download_js(js_urls)

    with cf.ThreadPoolExecutor(max_workers=16) as ex:
        list(ex.map(fetch_one, sorted(urls)))

    mb = stats["bytes"] / 1e6
    print(f"done ok={stats['ok']} skip={stats['skip']} fail={stats['fail']} ({mb:.1f} MB)")
    for f in failures[:25]:
        print("  FAIL", f)
    return 1 if stats["fail"] > 20 else 0


if __name__ == "__main__":
    raise SystemExit(main())
