#!/usr/bin/env python3
"""Stage 4 — generate static app-shell content pages from crawled raw HTML.

For each (route, raw file):
  * extract SEO head (title/description/robots/canonical/og/twitter/JSON-LD)
  * slice the page body between the app header bar and the <footer>
    (header/footer themselves are re-rendered by the shared SiteHeader /
    SiteFooter components, with the header variant detected from the raw)
  * convert the slice with scripts/html2tsx.py (URL rewrites + brand swaps)
  * emit src/pages/<route>.tsx

Source of truth = %TEMP%/opencode/twc_research/raw (capture + approved live
crawl). Re-running is idempotent; pages are marked generated and any hand
edits must be re-applied after regeneration (same rule as homepage sections).
"""
from __future__ import annotations

import html as htmllib
import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import html2tsx as h2t  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parents[1]
RAW = pathlib.Path(r"C:\Users\MODI\AppData\Local\Temp\opencode\twc_research\raw")
PAGES_DIR = ROOT / "src" / "pages"

VOID = h2t.VOID
# Balancing regex (unlike h2t.TAG_RE) also matches closing tags.
TAGBAL_RE = re.compile(
    r"<(/?)([a-zA-Z][a-zA-Z0-9:-]*)((?:[^>\"']|\"[^\"]*\"|'[^']*')*?)(/?)>", re.S
)

# route -> (raw file, component name)
PAGES = [
    ("/about-us", "about-us.html", "AboutUsPage"),
    ("/account-deletion", "account-deletion.html", "AccountDeletionPage"),
    ("/contact-us", "contact-us.html", "ContactUsPage"),
    ("/price-beat-challenge", "price-beat-challenge.html", "PriceBeatChallengePage"),
    ("/refund-policy", "refund-policy.html", "RefundPolicyPage"),
    ("/twc-client-terms", "twc-client-terms.html", "TwcClientTermsPage"),
    ("/twc-vendor-terms", "twc-vendor-terms.html", "TwcVendorTermsPage"),
    ("/wedding-payment-plan", "wedding-payment-plan.html", "WeddingPaymentPlanPage"),
    ("/wedding-services", "wedding-services.html", "WeddingServicesPage"),
]


def balanced_span(html: str, start: int) -> tuple[int, int]:
    """(start, end_exclusive) of the element opening at/before `start`."""
    i = html.find("<", start)
    if i < 0 or html.startswith("<!--", i):
        # comment — skip it and retry from its end
        endc = html.find("-->", i)
        return balanced_span(html, endc + 3) if endc >= 0 else (i, -1)
    depth = 0
    for m in TAGBAL_RE.finditer(html, i):
        closing = m.group(1) == "/"
        tag = m.group(2).lower()
        self_close = m.group(4) == "/" or tag in VOID
        if self_close and not closing:
            if depth == 0 and m.start() == i:
                return (i, m.end())
            continue
        if not closing:
            depth += 1
        else:
            depth -= 1
            if depth == 0:
                return (i, m.end())
    return (i, -1)


def local_tag_balance(body: str) -> tuple[list[str], list[str]]:
    """Simulate tag balance over the content slice.

    Returns (still-open tags at slice end, stray closers). Still-open tags are
    elements that in the original wrap the footer — the generator emits their
    closing tags after <SiteFooter />. Stray closers (elements opened before
    the header and closed inside the slice) are structural surprises and must
    be zero.
    """
    stack: list[str] = []
    strays: list[str] = []
    for m in TAGBAL_RE.finditer(body):
        closing = m.group(1) == "/"
        tag = m.group(2).lower()
        self_close = m.group(4) == "/" or tag in VOID
        if self_close and not closing:
            continue
        if not closing:
            stack.append(m.group(2))
        else:
            if stack and stack[-1].lower() == tag:
                stack.pop()
            else:
                strays.append(tag)
    return stack, strays


def find_header(html: str) -> tuple[int, int, str]:
    """Locate the app header bar; return (start, end, variant)."""
    marker = html.find("translate-y-0 justify-between")
    if marker < 0:
        raise ValueError("header marker not found")
    start = html.rfind("<div", 0, marker)
    if start < 0:
        raise ValueError("header <div> not found")
    open_end = html.find(">", start)
    open_tag = html[start : open_end + 1]
    if "fixed inset-x-0" in open_tag:
        variant = "fixed"
    elif "sticky" in open_tag:
        variant = "sticky"
    elif "relative" in open_tag:
        variant = "relative"
    else:
        variant = "sticky"
    s, e = balanced_span(html, start)
    return s, e, variant


def extract_jsonld(html: str) -> list[str]:
    return [
        m.group(1)
        for m in re.finditer(
            r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>', html, re.S
        )
    ]


def meta_val(content: str) -> str:
    """Decode entities, apply rewrites + brand swap for a meta/attr value."""
    v = htmllib.unescape(content)
    v = h2t.rewrite_url(v)
    return h2t.swap_brand(v)


def extract_seo(html: str) -> dict:
    seo: dict = {}
    t = re.search(r"<title[^>]*>(.*?)</title>", html, re.S | re.I)
    if t:
        title = h2t.swap_brand(htmllib.unescape(t.group(1).strip()))
        if title:
            seo["title"] = title
    m = re.search(r'<meta name="description" content="([^"]*)"', html)
    if m:
        seo["description"] = meta_val(m.group(1))
    m = re.search(r'<meta name="robots" content="([^"]*)"', html)
    if m:
        seo["robots"] = htmllib.unescape(m.group(1))
    m = re.search(r'<link rel="canonical" href="([^"]*)"', html)
    if m:
        seo["canonical"] = meta_val(m.group(1))
    og = []
    for m in re.finditer(r'<meta property="(og:[^"]*)" content="([^"]*)"', html):
        og.append((m.group(1), meta_val(m.group(2))))
    if og:
        seo["og"] = og
    tw = []
    for m in re.finditer(r'<meta name="(twitter:[^"]*)" content="([^"]*)"', html):
        tw.append((m.group(1), meta_val(m.group(2))))
    if tw:
        seo["twitter"] = tw
    seo["jsonld"] = extract_jsonld(html)
    return seo


def strip_sticky_bar(html: str) -> str:
    """Remove the sticky CTA bar block if it lives inside the content slice."""
    i = html.find('id="sticky_whatsapp"')
    while i >= 0:
        start = html.rfind("<", 0, i)
        # walk back to the outer container: the bar root is a motion.div fixed
        # container — find its balanced span starting a bit earlier by scanning
        # for the enclosing '<div class="fixed bottom-0' if present, else the
        # element owning the id.
        fixed = html.rfind('class="fixed bottom-0', 0, i)
        anchor = fixed if fixed > 0 else start
        anchor = html.rfind("<", 0, anchor + 1)
        s, e = balanced_span(html, anchor)
        if e < 0:
            break
        html = html[:s] + html[e:]
        i = html.find('id="sticky_whatsapp"')
    return html


def emit_head(seo: dict, extra_lines: list[str] | None = None) -> str:
    lines = ["      <Head>"]
    if "title" in seo:
        lines.append(f"        <title>{{{json.dumps(seo['title'])}}}</title>")
    # Values are emitted as JSX expressions ({ "..." }) so json.dumps escapes
    # (\u2014, \n, ...) are interpreted by JS instead of rendering literally.
    if "description" in seo:
        lines.append(f'        <meta name="description" content={{{json.dumps(seo["description"])}}} />')
    if "robots" in seo:
        lines.append(f'        <meta name="robots" content={{{json.dumps(seo["robots"])}}} />')
    if "canonical" in seo:
        lines.append(f'        <link rel="canonical" href={{{json.dumps(seo["canonical"])}}} />')
    for k, v in seo.get("og", []):
        lines.append(f'        <meta property={{{json.dumps(k)}}} content={{{json.dumps(v)}}} />')
    for k, v in seo.get("twitter", []):
        lines.append(f'        <meta name={{{json.dumps(k)}}} content={{{json.dumps(v)}}} />')
    for block in seo.get("jsonld", []):
        safe = block.replace("*/", "* /")
        lines.append(
            '        <script type="application/ld+json" dangerouslySetInnerHTML={{__html: '
            + json.dumps(safe)
            + " }} />"
        )
    for ln in extra_lines or []:
        lines.append("        " + ln)
    if len(lines) == 1:
        return ""  # no SEO at all — faithful to the original's title-less pages
    lines.append("      </Head>")
    return "\n".join(lines)


def indent_body(jsx: str) -> str:
    return "\n".join(("      " + ln) if ln.strip() else ln for ln in jsx.splitlines())


# Standalone pages: own header/footer inside the content (no app shell).
# route -> (raw file, component name)
STANDALONE_PAGES = [
    ("/integrity-program", "integrity-program.html", "IntegrityProgramPage"),
]


def extract_head_links(html: str) -> list[str]:
    """Local stylesheets + Google-fonts links + preloads from the raw <head>.

    Excludes: /_next assets (the Next app serves its own fonts), favicon
    (brand favicon from _app) and modulepreload (the SPA's JS is intentionally
    NOT loaded on this page — see component comment).
    """
    keep = []
    for m in re.finditer(r"<link\b[^>]*>", html):
        tag = m.group(0)
        rel = re.search(r'rel="([^"]+)"', tag)
        href = re.search(r'href="([^"]+)"', tag)
        if not rel or not href:
            continue
        r, h = rel.group(1), href.group(1)
        if r in ("icon", "shortcut icon", "apple-touch-icon", "modulepreload", "prefetch"):
            continue
        if h.startswith("/_next/"):
            continue
        if r in ("stylesheet", "preconnect", "preload"):
            # our copy of the webflow CSS is byte-modified (url() rewrite to
            # self-hosted paths) — the captured sha384 integrity would fail.
            tag = re.sub(r'\s+integrity="[^"]*"', "", tag)
            keep.append(tag)
    # dedupe preserving order
    seen, out = set(), []
    for t in keep:
        if t not in seen:
            seen.add(t)
            out.append(t)
    return [h2t.convert(t) for t in out]


def build_standalone(route: str, raw_name: str, comp: str) -> str:
    html = (RAW / raw_name).read_text(encoding="utf-8", errors="ignore")
    seo = extract_seo(html)
    link_lines = extract_head_links(html)
    body_start = re.search(r"<body[^>]*>", html)
    body_end = html.rfind("</body>")
    if not body_start or body_end < 0:
        raise ValueError(f"{raw_name}: body not found")
    body = html[body_start.end() : body_end]
    open_wrappers, strays = local_tag_balance(body)
    if strays:
        print(f"WARN {raw_name}: stray closers in body: {strays[:5]}", file=sys.stderr)
    jsx = h2t.convert(body)
    wrapper_closes = "".join(f"      </{t}>\n" for t in reversed(open_wrappers))
    head_block = emit_head(seo, link_lines)
    head_line = (head_block + "\n") if head_block else ""
    imports = ("import Head from 'next/head';\n" if head_block else "")
    return (
        f"/**\n"
        f" * {comp} — generated from twc_research/raw/{raw_name} by scripts/build_content_pages.py.\n"
        f" * Standalone page (original serves it under its own mini-app with no site shell).\n"
        f" * NOTE: the original's client bundle (report-case modal / multi-step form) is NOT\n"
        f" * loaded — it hydrates the whole document and would evict the Next app shell; the\n"
        f" * static design is reproduced faithfully and interactive wiring is deferred\n"
        f" * (flagged in the Stage 4 report).\n"
        f" */\n"
        f"{imports}"
        f"\n"
        f"export default function {comp}() {{\n"
        f"  return (\n"
        f"    <>\n"
        f"{head_line}"
        f"{indent_body(jsx)}\n"
        f"{wrapper_closes}"
        f"    </>\n"
        f"  );\n"
        f"}}\n"
    )


def main() -> int:
    PAGES_DIR.mkdir(parents=True, exist_ok=True)
    report = []
    for route, raw_name, comp in PAGES:
        raw_path = RAW / raw_name
        if not raw_path.exists():
            print(f"MISSING RAW {raw_name}", file=sys.stderr)
            return 1
        html = raw_path.read_text(encoding="utf-8", errors="ignore")

        seo = extract_seo(html)
        hs, he, variant = find_header(html)
        if he < 0:
            raise ValueError(f"{raw_name}: header span unbalanced")
        fi = html.find("<footer")
        if fi < 0:
            raise ValueError(f"{raw_name}: footer not found")
        fs, fe = balanced_span(html, fi)
        if fs < 0 or fe < 0 or fe <= fs:
            raise ValueError(f"{raw_name}: footer span unbalanced")
        if not (he < fs):
            raise ValueError(f"{raw_name}: header end ({he}) not before footer ({fs})")

        body = html[he:fs]
        body = strip_sticky_bar(body)
        open_wrappers, strays = local_tag_balance(body)
        if strays:
            print(
                f"WARN {raw_name}: {len(strays)} stray closing tag(s) in slice "
                f"(first: {strays[:5]})",
                file=sys.stderr,
            )
        jsx = h2t.convert(body)
        wrapper_closes = "".join(f"      </{t}>\n" for t in reversed(open_wrappers))

        sticky = 'id="sticky_whatsapp"' in html
        head_block = emit_head(seo)
        head_line = (head_block + "\n") if head_block else ""
        imports = (
            ("import Head from 'next/head';\n" if head_block else "")
            + "import SiteHeader from '@/components/layout/SiteHeader';\n"
            + "import SiteFooter from '@/components/layout/SiteFooter';\n"
            + ("import StickyCtaBar from '@/components/layout/StickyCtaBar';\n" if sticky else "")
        )
        out = (
            f"/**\n"
            f" * {comp} — generated from twc_research/raw/{raw_name} by scripts/build_content_pages.py.\n"
            f" * Source of truth = captured/crawled DOM. Hand edits allowed but mark them with\n"
            f" * `// HAND-EXTENSION:` comments so regeneration can be merged.\n"
            f" */\n"
            f"{imports}"
            f"\n"
            f"export default function {comp}() {{\n"
            f"  return (\n"
            f"    <>\n"
            f"{head_line}"
            f'      <SiteHeader variant="{variant}" />\n'
            f"{indent_body(jsx)}\n"
            f"      <SiteFooter />\n"
            + wrapper_closes
            + ("      <StickyCtaBar />\n" if sticky else "")
            + f"    </>\n"
            f"  );\n"
            f"}}\n"
        )
        out_path = PAGES_DIR / (route.lstrip("/") + ".tsx")
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(out, encoding="utf-8")
        report.append(
            f"{route:28} variant={variant:8} sticky={int(sticky)} "
            f"title={'Y' if 'title' in seo else 'n'} desc={'Y' if 'description' in seo else 'n'} "
            f"ld={len(seo.get('jsonld', []))} out={len(out)}B"
        )
    for route, raw_name, comp in STANDALONE_PAGES:
        out = build_standalone(route, raw_name, comp)
        out_path = PAGES_DIR / (route.lstrip("/") + ".tsx")
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(out, encoding="utf-8")
        report.append(f"{route:28} standalone out={len(out)}B")
    print("\n".join(report))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
