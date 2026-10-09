#!/usr/bin/env python3
"""Stage 3b — convert extracted homepage section HTML into TSX components.

Rules:
  * token walk keeps original bytes for max fidelity (entities preserved)
  * class→className, for→htmlFor, attr camelCasing (HTML map + SVG dashes)
  * boolean attrs → bare JSX (renders true), style="a:b" → style={{a:'b'}}
  * void elements self-close; <script> stripped; <style> kept as JS string
  * URLs: /_next/static/media→/media, gcpimages host→/gcpimages,
    website-files.com→/webflow/img, absolute theweddingcompany.com→local path
    (all other hosts untouched)
  * brand text swap (text nodes + alt/aria-label/title only):
    "The Wedding Company"→"Vantara", word "TWC"→"Vantara"  [sync with src/config/site.ts]
  * <!--SLOT--> → {children} (venues block composition)
Output: src/components/home/*.tsx + src/components/layout/{SiteHeader,SiteFooter,StickyCtaBar}.tsx
"""
from __future__ import annotations

import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
SECTIONS_DIR = ROOT / "docs" / "research" / "homepage" / "sections"
OUT_HOME = ROOT / "src" / "components" / "home"
OUT_LAYOUT = ROOT / "src" / "components" / "layout"

TAG_RE = re.compile(r"<\s*([a-zA-Z][a-zA-Z0-9:-]*)((?:[^>\"']|\"[^\"]*\"|'[^']*')*?)(/?)>", re.S)
CLOSER_RE = re.compile(r"</\s*([a-zA-Z][a-zA-Z0-9:-]*)\s*>")
ATTR_RE = re.compile(r"([^\s=]+)(?:\s*=\s*(\"[^\"]*\"|'[^']*'|[^\s>]+))?")

VOID = {
    "area", "base", "br", "col", "embed", "hr", "img", "input", "link",
    "meta", "param", "source", "track", "wbr",
}
RAW_TEXT = {"script", "style"}

BOOL_PROPS = {
    "allowfullscreen", "allowpaymentrequest", "async", "autofocus", "autoplay",
    "checked", "controls", "default", "defer", "disabled", "disablepictureinpicture",
    "disableremoteplayback", "formnovalidate", "hidden", "inert", "ismap",
    "itemscope", "loop", "multiple", "muted", "nomodule", "novalidate", "open",
    "playsinline", "readonly", "required", "reversed", "selected",
}

ATTR_MAP = {
    "class": "className", "for": "htmlFor", "http-equiv": "httpEquiv",
    "accept-charset": "acceptCharset", "charset": "charSet", "tabindex": "tabIndex",
    "autocomplete": "autoComplete", "autofocus": "autoFocus",
    "autocapitalize": "autoCapitalize", "autocorrect": "autoCorrect",
    "readonly": "readOnly", "maxlength": "maxLength", "minlength": "minLength",
    "srcset": "srcSet", "imagesrcset": "imageSrcSet", "crossorigin": "crossOrigin",
    "novalidate": "noValidate", "formnovalidate": "formNoValidate",
    "frameborder": "frameBorder", "allowfullscreen": "allowFullScreen",
    "fetchpriority": "fetchPriority", "itemprop": "itemProp",
    "itemscope": "itemScope", "itemtype": "itemType", "datetime": "dateTime",
    "srcdoc": "srcDoc", "referrerpolicy": "referrerPolicy",
    "playsinline": "playsInline", "inputmode": "inputMode",
    "enterkeyhint": "enterKeyHint", "contenteditable": "contentEditable",
    "spellcheck": "spellCheck", "accesskey": "accessKey", "usemap": "useMap",
    "ismap": "isMap", "colspan": "colSpan", "rowspan": "rowSpan",
    "formaction": "formAction", "formenctype": "formEnctype",
    "formmethod": "formMethod", "formtarget": "formTarget",
    "hreflang": "hrefLang", "allowtransparency": "allowTransparency",
    "autoplay": "autoPlay", "nomodule": "noModule",
    "allowpaymentrequest": "allowPaymentRequest",
    "disablepictureinpicture": "disablePictureInPicture",
}

URL_ATTRS = {"href", "src", "srcset", "poster", "action", "data-src", "xlink:href", "content"}

# React types these as number → emit bare digits
NUMERIC_ATTRS = {
    "tabindex", "colspan", "rowspan", "maxlength", "minlength",
    "rows", "cols", "size", "start", "reversed",
}

# brand swaps — keep in sync with src/config/site.ts (site.shortName / site.name)
BRAND_TEXT = [
    ("The Wedding Company", "Vantara"),
    # Stage 4 label policy — Title-case "Wedding X" site-category labels become
    # "Vantara X" (longest first). Common-noun prose ("wedding venues in Delhi",
    # "Wedding Planning Services Offered by Vantara", role nouns like "Wedding
    # Planner") is intentionally NOT in this list — it stays verbatim.
    ("Wedding Photography Services", "Vantara Photography Services"),
    ("Wedding Decoration Services", "Vantara Decoration Services"),
    ("Wedding Invitation Card", "Vantara Invitation Card"),
    ("Wedding Photographers", "Vantara Photographers"),
    ("Wedding Photography", "Vantara Photography"),
    ("Wedding Decorators", "Vantara Decorators"),
    ("Wedding Services", "Vantara Services"),
    ("Wedding Portfolio", "Vantara Portfolio"),
    ("Wedding Venues", "Vantara Venues"),
    ("Wedding Ideas", "Vantara Ideas"),
    ("Wedding Blog", "Vantara Blog"),
]
BRAND_WORD_RE = re.compile(r"\bTWC\b")

ENTITY_OK = re.compile(r"&(?:[a-zA-Z][a-zA-Z0-9]*|#\d+|#x[0-9a-fA-F]+);")


def rewrite_url(v: str) -> str:
    v = v.replace("/_next/static/media/", "/media/")
    v = re.sub(r"(?:https?:)?//gcpimages\.theweddingcompany\.com", "/gcpimages", v)
    # Webflow CDN (stage-4 pages self-hosted by scripts/fetch_webflow_assets.py)
    v = re.sub(
        r"(?:https?:)?//(?:cdn\.prod\.)?website-files\.com/[0-9a-f]+/",
        "/webflow/img/",
        v,
    )
    v = re.sub(r"(?:https?:)?//(?:www\.)?theweddingcompany\.com", "", v)
    return v


def swap_brand(v: str) -> str:
    for a, b in BRAND_TEXT:
        v = v.replace(a, b)
    return BRAND_WORD_RE.sub("Vantara", v)


def camel_part(p: str) -> str:
    return p[:1].upper() + p[1:]


def conv_attr_name(name: str) -> str:
    if name.startswith("data-") or name.startswith("aria-"):
        return name
    low = name.lower()
    if low in ATTR_MAP:
        return ATTR_MAP[low]
    if ":" in name:
        head, _, tail = name.partition(":")
        return head + camel_part(tail)
    if "-" in name:
        # Dashed names stay dashed: React passes unknown dashed attrs through
        # verbatim (e.g. Webflow's fs-cmsfilter-field, SVG stroke-width), and
        # JSX type-checks hyphenated attributes. Known mappings live in ATTR_MAP.
        if name.startswith("-"):
            parts = [p for p in name.split("-") if p]
            return "Webkit" + "".join(camel_part(p) for p in parts)
        return name
    # preserve known SVG camelCase as-is; lowercase unknown singles unchanged
    return name


def camel_css_key(k: str) -> str:
    if k.startswith("-"):
        # -webkit-transform -> WebkitTransform; -ms-transform -> msTransform
        # (csstype keeps the Microsoft prefix lowercase, others capitalized).
        parts = [p for p in k.split("-") if p]
        if parts and parts[0].lower() == "ms":
            return "ms" + "".join(camel_part(p) for p in parts[1:])
        return "".join(camel_part(p) for p in parts)
    parts = k.split("-")
    return parts[0] + "".join(camel_part(p) for p in parts[1:])


def conv_style(v: str) -> str:
    decls = []
    for d in v.split(";"):
        if ":" not in d:
            continue
        k, val = d.split(":", 1)
        k, val = k.strip(), val.strip()
        if not k or not val:
            continue
        val = val.replace("\\", "\\\\").replace("'", "\\'")
        decls.append(f"{camel_css_key(k)}: '{val}'")
    return "{{" + ", ".join(decls) + "}}"


def conv_attrs(attr_str: str, tag: str | None = None) -> str:
    out: list[str] = []
    for m in ATTR_RE.finditer(attr_str):
        raw_name, raw_val = m.group(1), m.group(2)
        if not raw_name or raw_name == "/":
            continue
        name_l = raw_name.lower()
        jsx_name = conv_attr_name(raw_name)
        if raw_val is None:  # bare attribute
            out.append(jsx_name)
            continue
        quoted = raw_val[0] in "\"'" and raw_val[0] == raw_val[-1]
        val = raw_val[1:-1] if quoted else raw_val
        if jsx_name == "htmlFor" and tag and tag.lower() != "label":
            # Webflow puts `for` on <span> filter labels; htmlFor only type-
            # checks on <label>. A typed spread keeps the raw attribute name.
            out.append("{...({ for: " + json.dumps(val) + " } as Record<string, string>)}")
            continue
        if name_l == "style":
            out.append(f"{jsx_name}={conv_style(val)}")
            continue
        if name_l in BOOL_PROPS:
            out.append(jsx_name)  # present → true
            continue
        if name_l in NUMERIC_ATTRS and val.isdigit():
            out.append(f"{jsx_name}={{{val}}}")  # JSX needs expression braces
            continue
        if name_l in URL_ATTRS or "://" in val or name_l.startswith("data-src"):
            val = rewrite_url(val)
        if name_l in {"alt", "aria-label", "title", "placeholder"}:
            val = swap_brand(val)
        out.append(f'{jsx_name}="{val}"')
    return (" " + " ".join(out)) if out else ""


def esc_text(s: str) -> str:
    """Make a raw text run JSX-safe: keep entities, escape < { } &."""
    # escape raw & not starting a valid entity
    s = re.sub(r"&(?![a-zA-Z][a-zA-Z0-9]*;|#\d+;|#x[0-9a-fA-F]+;)", "&amp;", s)
    s = s.replace("<", "&lt;")
    s = s.replace("{", "&#123;").replace("}", "&#125;")
    return swap_brand(s)


def convert(html: str) -> str:
    out: list[str] = []
    pos = 0
    n = len(html)
    while pos < n:
        lt = html.find("<", pos)
        if lt < 0:
            out.append(esc_text(html[pos:]))
            break
        out.append(esc_text(html[pos:lt]))
        if html.startswith("<!--", lt):
            end = html.find("-->", lt)
            body = html[lt + 4 : end if end >= 0 else n]
            if body.strip() == "SLOT":
                out.append("{children}")
            else:
                safe = body.replace("*/", "* /")
                out.append("{/*" + safe + "*/}")
            pos = (end + 3) if end >= 0 else n
            continue
        m = TAG_RE.match(html, lt)
        if not m:
            cm = CLOSER_RE.match(html, lt)
            if cm:  # closing tag </name>
                out.append(f"</{cm.group(1)}>")
                pos = cm.end()
                continue
            out.append("&lt;")  # '<' used as text
            pos = lt + 1
            continue
        tag = m.group(1).lower()
        self_close = m.group(3) == "/"
        if tag in RAW_TEXT:
            close = re.search(rf"</\s*{tag}\s*>", html[m.end() :], re.I)
            content_end = m.end() + (close.start() if close else 0)
            content = html[m.end() : content_end]
            skip = m.end() + (close.end() if close else n)
            if tag == "script":
                # drop entirely — emitting even an empty <script src> would fetch
                out.append("{/* <script stripped by html2tsx */}")
            else:  # style: keep as JSX <style> with the CSS as a JS string child
                out.append(
                    f"<style{conv_attrs(m.group(2))}>"
                    + "{"
                    + json.dumps(content)
                    + "}"
                    + "</style>"
                )
            pos = skip
            continue
        out.append(f"<{conv_attr_name(m.group(1))}{conv_attrs(m.group(2), m.group(1))}")
        if not self_close and tag in VOID:
            out.append(" />")
            out.append("")
            pos = m.end()
            continue
        if self_close:
            out.append(" />")
            pos = m.end()
            continue
        out.append(">")
        pos = m.end()
        continue
    return "".join(out)


# file → (component name, output dir, extra note)
COMPONENTS = [
    ("header_nav.html", "SiteHeader", OUT_LAYOUT, "app shell nav"),
    ("home-page-revamp.html", "SectionHero", OUT_HOME, "hero + video carousels (keen)"),
    ("client_reviews.html", "SectionClientReviews", OUT_HOME, "tagembed widgets — D7 deferred"),
    ("how_it_works_outer_section.html", "SectionHowItWorks", OUT_HOME, ""),
    ("book_venues_section.html", "SectionBookVenues", OUT_HOME, ""),
    ("venues_block.html", "SectionVenuesBlock", OUT_HOME, "wrapper with {children} slot"),
    ("industry_partners_section.html", "SectionIndustryPartners", OUT_HOME, "keen autoplay logo strip"),
    ("end_to_end_services_section.html", "SectionEndToEndServices", OUT_HOME, ""),
    ("wedding_proposals_section.html", "SectionWeddingProposals", OUT_HOME, "keen auto-advance slider"),
    ("explore_wedding_ideas_section.html", "SectionWeddingIdeas", OUT_HOME, ""),
    ("why_are_we_better_section.html", "SectionWhyBetter", OUT_HOME, ""),
    ("frequently_asked_questions_section.html", "SectionFaq", OUT_HOME, "accordion — hand-extended"),
    ("are_you_a_vendor_section.html", "SectionVendorCta", OUT_HOME, ""),
    ("more_about_betterhalf_section.html", "SectionAbout", OUT_HOME, ""),
    ("footer_section.html", "SiteFooter", OUT_LAYOUT, "app shell footer"),
    ("sticky_cta_bar.html", "StickyCtaBar", OUT_LAYOUT, "floating WhatsApp + CTA"),
]

HEADER = """/**
 * {name} — generated from docs/research/homepage/sections/{src} by scripts/html2tsx.py.
 * Source of truth = captured DOM. Hand extensions (interactivity) are allowed but
 * must be marked with `// HAND-EXTENSION:` comments so regeneration can be merged.
 {note}
 */
"""


def main() -> int:
    OUT_HOME.mkdir(parents=True, exist_ok=True)
    OUT_LAYOUT.mkdir(parents=True, exist_ok=True)
    report = []
    for src_name, comp, outdir, note in COMPONENTS:
        src = SECTIONS_DIR / src_name
        if not src.exists():
            print(f"MISSING {src_name}", file=sys.stderr)
            return 1
        html = src.read_text(encoding="utf-8")
        body = convert(html)
        header = HEADER.format(
            name=comp,
            src=src_name,
            note=f" * Notes: {note}" if note else "",
        )
        if "{children}" in body:
            header += 'import type { ReactNode } from "react";\n\n'
            sig = "{ children }: { children?: ReactNode }"
            use_children = True
        else:
            sig = ""
            use_children = False
        body_indented = "\n".join("    " + ln if ln.strip() else ln for ln in body.splitlines())
        code = (
            header
            + f"export default function {comp}({sig}) {{\n"
            + "  return (\n"
            + "    <>\n"
            + body_indented
            + "\n    </>\n"
            + "  );\n"
            + "}\n"
        )
        if use_children:
            code = code.replace("{children}", "{children}")
        (outdir / f"{comp}.tsx").write_text(code, encoding="utf-8")
        report.append(f"{comp:26} {len(code):8} bytes  <- {src_name}")
    print("\n".join(report))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
