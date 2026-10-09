#!/usr/bin/env python3
"""Stage 4 — generate the 8 Webflow pages (cdn.prod.website-files.com family).

Per page:
  * preprocess: official Vantara logo replaces the TWC pink-horizontal logo imgs
    (srcset/sizes dropped), GTM noscript block removed (D7 — dormant analytics),
    inline/external scripts split into keep-list (WebFont loader, w-mod js-class,
    currency settings, webflow/jquery runtimes) vs analytics-exclude.
  * SEO head via build_content_pages helpers (title/desc/canonical → local path).
  * shared Webflow CSS self-hosted at /webflow/img/css/... (integrity attr dropped
    — the CSS bytes change with url() rewrites), JS at /webflow/js/...
  * body converted with html2tsx (website-files CDN → /webflow/img, brand swaps).

Source: %TEMP%/opencode/twc_research/raw + assets from scripts/fetch_webflow_assets.py.
"""
from __future__ import annotations

import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import html2tsx as h2t  # noqa: E402
import build_content_pages as bcp  # noqa: E402

RAW = bcp.RAW
PAGES_DIR = bcp.PAGES_DIR

# route -> (raw file, component name)
WEBFLOW_PAGES = [
    ("/careers", "careers.html", "CareersPage"),
    ("/lp/partner-onboarding-form", "lp__partner-onboarding-form.html", "PartnerOnboardingFormPage"),
    ("/privacy-policy", "privacy-policy.html", "PrivacyPolicyPage"),
    ("/safety-guideline", "safety-guideline.html", "SafetyGuidelinePage"),
    ("/success-stories", "success-stories.html", "SuccessStoriesPage"),
    ("/twc-privacy-policy", "twc-privacy-policy.html", "TwcPrivacyPolicyPage"),
    ("/wedding-invitation-card", "wedding-invitation-card.html", "WeddingInvitationCardPage"),
    ("/wedding-portfolio", "wedding-portfolio.html", "WeddingPortfolioPage"),
]

ANALYTICS_TOKENS = (
    "googletagmanager",
    "adsbygoogle",
    "dataLayer",
    "gtag(",
    "pagead2",
    "_paq",
    "flock",
)

# Phase 5 §13.1 (O2): never call TWC/Betterhalf endpoints — any script that
# references them is dropped (e.g. success-stories' api.betterhalf.ai
# text-invite AJAX).
TWC_API_TOKENS = (
    "api.betterhalf.ai",
    "theweddingcompany.com",
    "weddingapi",
    "weddingconsumerapi",
    "gcpstaging1",
    "userapp",
)

INLINE_RE = re.compile(r"<script(?![^>]*\ssrc=)[^>]*>(.*?)</script>", re.S | re.I)
SRC_RE = re.compile(r'<script[^>]*\ssrc="([^"]+)"[^>]*>', re.I)


def replace_logos(html: str) -> tuple[str, int]:
    """Replace <img> tags carrying the TWC pink-horizontal logo with the
    official Vantara logo. class kept (original CSS still sizes the slot);
    srcset/sizes/width/height dropped so the vertical logo keeps its aspect."""
    count = 0

    def repl(m: re.Match) -> str:
        nonlocal count
        tag = m.group(0)
        if "pink_horizontal_4x" not in tag:
            return tag
        count += 1
        cls = re.search(r'\sclass="([^"]*)"', tag)
        alt = re.search(r'\salt="([^"]*)"', tag)
        parts = ['<img src="/brand/vantara-logo.png"', 'loading="lazy"']
        if cls:
            parts.append(f'class="{cls.group(1)}"')
        parts.append(f'alt="{alt.group(1) if alt else ""}"')
        return " ".join(parts) + " />"

    return re.sub(r"<img\b[^>]*>", repl, html), count


def strip_gtm(html: str) -> tuple[str, int]:
    """Remove GTM noscript blocks (D7 — analytics stay dormant)."""
    removed = 0
    while True:
        i = html.find('<div class="google-tag-manager')
        if i < 0:
            return html, removed
        s, e = bcp.balanced_span(html, i)
        if e < 0:
            html = html[:i]
        else:
            html = html[:s] + html[e:]
        removed += 1


def keep_script(content: str) -> bool:
    low = content.lower()
    if any(t in low for t in TWC_API_TOKENS):
        return False  # Phase 5 (O2): never call TWC endpoints
    return not any(t in low for t in ANALYTICS_TOKENS)


def map_script_url(url: str) -> str | None:
    low = url.lower()
    if any(t in low for t in ANALYTICS_TOKENS) or any(t in low for t in TWC_API_TOKENS):
        return None
    name = url.split("?")[0].rsplit("/", 1)[-1]
    if "webflow" in low or "jquery" in low:
        return f"/webflow/js/{name}"
    return url  # google-hosted helpers stay absolute


def emit_script_lines(urls: list[str]) -> list[str]:
    out = []
    for u in urls:
        mapped = map_script_url(u)
        if mapped:
            out.append(f'<script src="{mapped}" />')
    return out


def main() -> int:
    report = []
    for route, raw_name, comp in WEBFLOW_PAGES:
        html = (RAW / raw_name).read_text(encoding="utf-8", errors="ignore")

        html, logos = replace_logos(html)
        html, gtm = strip_gtm(html)

        head_end = html.find("<body")
        head_part, body_part = html[:head_end], html[head_end:]

        head_inline = [m.group(1) for m in INLINE_RE.finditer(head_part) if keep_script(m.group(1))]
        body_inline = [m.group(1) for m in INLINE_RE.finditer(body_part) if keep_script(m.group(1))]
        head_src = [m.group(1) for m in SRC_RE.finditer(head_part)]
        body_src = [m.group(1) for m in SRC_RE.finditer(body_part)]

        seo = bcp.extract_seo(html)
        link_lines = bcp.extract_head_links(html)
        extra = list(link_lines)
        for c in head_inline:
            safe = c.replace("</", "<\\/")
            # plain concatenation: JSX object literal needs doubled braces
            extra.append('<script dangerouslySetInnerHTML={{__html: ' + json.dumps(safe) + " }} />")
        extra.extend(emit_script_lines(head_src))

        body_start = re.search(r"<body[^>]*>", html)
        body_end = html.rfind("</body>")
        if not body_start or body_end < 0:
            raise ValueError(f"{raw_name}: body not found")
        body = html[body_start.end() : body_end]
        open_wrappers, strays = bcp.local_tag_balance(body)
        if strays:
            print(f"WARN {raw_name}: stray closers {strays[:5]}", file=sys.stderr)
        jsx = h2t.convert(body)
        wrapper_closes = "".join(f"      </{t}>\n" for t in reversed(open_wrappers))

        head_block = bcp.emit_head(seo, extra)
        head_line = (head_block + "\n") if head_block else ""
        imports = "import Head from 'next/head';\n" if head_block else ""

        # body scripts (jquery -> webflow runtimes) render after the markup,
        # exactly where the original has them.
        script_lines = "".join(f"      {ln}\n" for ln in emit_script_lines(body_src))
        for c in body_inline:
            safe = c.replace("</", "<\\/")
            script_lines += "      <script dangerouslySetInnerHTML={{__html: " + json.dumps(safe) + " }} />\n"

        out = (
            f"/**\n"
            f" * {comp} — generated from twc_research/raw/{raw_name} by scripts/build_webflow_pages.py.\n"
            f" * Webflow page converted verbatim: own nav/footer markup, shared webflow CSS + JS\n"
            f" * self-hosted under /webflow/, TWC logo imgs replaced with the official Vantara logo,\n"
            f" * GTM/AdSense snippets excluded (dormant per D7). Hand edits: mark `// HAND-EXTENSION:`.\n"
            f" */\n"
            f"{imports}"
            f"\n"
            f"export default function {comp}() {{\n"
            f"  return (\n"
            f"    <>\n"
            f"{head_line}"
            f"{bcp.indent_body(jsx)}\n"
            f"{wrapper_closes}"
            f"{script_lines}"
            f"    </>\n"
            f"  );\n"
            f"}}\n"
        )
        out_path = PAGES_DIR / (route.lstrip("/") + ".tsx")
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(out, encoding="utf-8")
        report.append(
            f"{route:32} logos={logos} inlineH={len(head_inline)} inlineB={len(body_inline)} "
            f"srcH={len(head_src)} srcB={len(body_src)} links={len(link_lines)} "
            f"title={'Y' if 'title' in seo else 'n'} out={len(out)}"
        )
    print("\n".join(report))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
