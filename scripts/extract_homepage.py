#!/usr/bin/env python3
"""Stage 3a — extract homepage pieces from captured index.html into
docs/research/homepage/ with boundaries aligned to JSX component balance.

Structure discovered (capture source of truth):
  <div id="parent-container">
    <main class="pb-2 lg:pb-6">          <- Layout owns (opens in header slice)
      header nav / hero / reviews / how_it_works / book_venues
      <div A>                            <- VenuesBlock wrapper
        <main id=venues>...</main> <svg/> <div B>
          [industry] [e2e] <div C/>      <- children slot
        </div B> <div D/> </div A>
      proposals ... footer
      [sticky CTA bar]
    </main>
  </div>
  [Toastify mount] <div id="portal"> <script __NEXT_DATA__>
"""
from __future__ import annotations

import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = pathlib.Path(
    r"C:\Users\MODI\OneDrive\Desktop\vantaraweddings_webapp\www.theweddingcompany.com"
    r"\www.theweddingcompany.com\index.html"
)
OUT = ROOT / "docs" / "research" / "homepage"

SECTIONS = [
    "home-page-revamp",
    "how_it_works_outer_section",
    "book_venues_section",
    "venues_in_different_cities_section",
    "industry_partners_section",
    "end_to_end_services_section",
    "wedding_proposals_section",
    "explore_wedding_ideas_section",
    "why_are_we_better_section",
    "frequently_asked_questions_section",
    "are_you_a_vendor_section",
    "more_about_betterhalf_section",
    "footer_section",
]

VOID = {
    "area", "base", "br", "col", "embed", "hr", "img", "input", "link",
    "meta", "param", "source", "track", "wbr",
}
RAW_TEXT = {"script", "style"}

TAG_RE = re.compile(r"<\s*([a-zA-Z][a-zA-Z0-9:-]*)((?:[^>\"']|\"[^\"]*\"|'[^']*')*?)(/?)>", re.S)
CLOSER_RE = re.compile(r"</\s*([a-zA-Z][a-zA-Z0-9:-]*)\s*>")


def find_element(html: str, elem_id: str, start: int = 0) -> tuple[int, int] | None:
    """Return (start, end) span of the element carrying id=elem_id."""
    idpos = html.find(f'id="{elem_id}"', start)
    if idpos < 0:
        return None
    lt = html.rfind("<", 0, idpos)
    while lt >= 0:
        m = TAG_RE.match(html, lt)
        if m and m.end() > idpos:  # this opening tag encloses the id attr
            break
        lt = html.rfind("<", 0, lt)
    if lt < 0:
        return None
    m = TAG_RE.match(html, lt)
    if not m:
        return None
    tag = m.group(1).lower()
    if m.group(3) == "/" or tag in VOID:
        return lt, m.end()
    pos = m.end()
    depth = 1
    while pos < len(html) and depth > 0:
        if html[pos] == "<":
            if html.startswith("<!--", pos):
                end = html.find("-->", pos)
                pos = end + 3 if end >= 0 else len(html)
                continue
            cm = CLOSER_RE.match(html, pos)
            if cm:
                if cm.group(1).lower() == tag:
                    depth -= 1
                    if depth == 0:
                        return lt, cm.end()
                pos = cm.end()
                continue
            tm = TAG_RE.match(html, pos)
            if tm:
                tname = tm.group(1).lower()
                if not tm.group(3) and tname not in VOID:
                    if tname == tag:
                        depth += 1
                    elif tname in RAW_TEXT:
                        close = re.search(rf"</\s*{tname}\s*>", html[tm.end():], re.I)
                        pos = tm.end() + (close.end() if close else 0)
                        continue
                    else:
                        pos = match_generic(html, pos, tname, tm.end())
                        continue
                pos = tm.end()
                continue
            pos += 1
            continue
        pos += 1
    return None


def match_generic(html: str, open_pos: int, tag: str, after_attrs: int) -> int:
    """Balanced close for a nested DIFFERENT tag (stack of all names)."""
    stack = [tag]
    pos = after_attrs
    while pos < len(html) and stack:
        if html[pos] == "<":
            if html.startswith("<!--", pos):
                end = html.find("-->", pos)
                pos = end + 3 if end >= 0 else len(html)
                continue
            cm = CLOSER_RE.match(html, pos)
            if cm:
                if stack and cm.group(1).lower() == stack[-1]:
                    stack.pop()
                pos = cm.end()
                continue
            tm = TAG_RE.match(html, pos)
            if tm:
                tname = tm.group(1).lower()
                if tm.group(3) or tname in VOID:
                    pos = tm.end()
                    continue
                if tname in RAW_TEXT:
                    close = re.search(rf"</\s*{tname}\s*>", html[tm.end():], re.I)
                    pos = tm.end() + (close.end() if close else 0)
                    continue
                stack.append(tname)
                pos = tm.end()
                continue
        pos += 1
    return pos


def balance(fragment: str) -> int:
    """Net open-tag depth (positive = unclosed tags remain)."""
    depth, pos = 0, 0
    while pos < len(fragment):
        if fragment.startswith("<!--", pos):
            end = fragment.find("-->", pos)
            pos = end + 3 if end >= 0 else len(fragment)
            continue
        if fragment[pos] == "<":
            cm = CLOSER_RE.match(fragment, pos)
            if cm:
                depth -= 1
                pos = cm.end()
                continue
            tm = TAG_RE.match(fragment, pos)
            if tm:
                tname = tm.group(1).lower()
                if not tm.group(3) and tname not in VOID:
                    if tname in RAW_TEXT:
                        close = re.search(rf"</\s*{tname}\s*>", fragment[tm.end():], re.I)
                        pos = tm.end() + (close.end() if close else 0)
                        continue
                    depth += 1
                pos = tm.end()
                continue
        pos += 1
    return depth


def main() -> int:
    html = SRC.read_text(encoding="utf-8", errors="ignore")
    sections_dir = OUT / "sections"
    sections_dir.mkdir(parents=True, exist_ok=True)
    for old in sections_dir.glob("*.html"):
        old.unlink()  # clear stale files from previous extraction passes
    manifest: dict[str, dict] = {}
    errors: list[str] = []

    # spans for all13 sections
    spans: dict[str, tuple[int, int]] = {}
    cursor = 0
    for sid in SECTIONS:
        sp = find_element(html, sid, cursor)
        if not sp:
            errors.append(f"section not found: {sid}")
            continue
        spans[sid] = sp
        cursor = sp[1]

    pc = re.search(r'<div[^>]*id="parent-container"[^>]*>', html)
    if not pc:
        errors.append("parent-container not found")
        return 1
    hero_start = spans["home-page-revamp"][0]

    def write(name: str, content: str, note: str = "") -> None:
        (sections_dir / name).write_text(content, encoding="utf-8")
        manifest[name] = {
            "bytes": len(content),
            "balance": balance(content),
            **({"note": note} if note else {}),
        }

    # 1. header nav (strip the Layout-owned <main> opener)
    header_raw = html[pc.end():hero_start]
    main_open = re.match(r"\s*<main[^>]*>", header_raw)
    if not main_open:
        errors.append("page <main> opener not found in header slice")
    nav = header_raw[main_open.end():] if main_open else header_raw
    write("header_nav.html", nav, "nav only; Layout owns <main class='pb-2 lg:pb-6'>")

    # 2. hero
    h0, h1 = spans["home-page-revamp"]
    write("home-page-revamp.html", html[h0:h1])

    # 3. client reviews (unlisted section between hero and how_it_works)
    r0, r1 = h1, spans["how_it_works_outer_section"][0]
    reviews = html[r0:r1]
    if reviews.strip():
        write("client_reviews.html", reviews, "unlisted: tagembed review widgets")
    else:
        errors.append("hero->how gap empty (expected reviews section)")

    # 4-5. how_it_works, book_venues (spans; gaps to next are whitespace-only)
    write("how_it_works_outer_section.html", html[spans["how_it_works_outer_section"][0]: spans["how_it_works_outer_section"][1]])
    write("book_venues_section.html", html[spans["book_venues_section"][0]: spans["book_venues_section"][1]])

    # 6. venues block = A + venues main + svg/B-open + SLOT + C/B-close/D/A-close
    b0, b1 = spans["book_venues_section"][1], spans["venues_in_different_cities_section"][0]
    pre = html[b0:b1]  # div A opener
    v0, v1 = spans["venues_in_different_cities_section"]
    mid = html[v1:spans["industry_partners_section"][0]]  # svg + div B opener
    i0, i1 = spans["industry_partners_section"]
    e0, e1 = spans["end_to_end_services_section"]
    tail_gap = html[e1:spans["wedding_proposals_section"][0]]  # C + </B> + D + </A>
    block = pre + html[v0:v1] + mid + "<!--SLOT-->" + tail_gap
    write(
        "venues_block.html",
        block,
        "wrapper A>B with children SLOT = industry + e2e (+C literal)",
    )
    write("industry_partners_section.html", html[i0:i1])
    write("end_to_end_services_section.html", html[e0:e1])

    # 7-13. remaining sections (assert inter-section gaps are whitespace-only)
    order_after = SECTIONS[SECTIONS.index("wedding_proposals_section"):]
    for idx, sid in enumerate(order_after):
        s0, e_ = spans[sid]
        write(f"{sid}.html", html[s0:e_])
        nxt = spans[order_after[idx + 1]][0] if idx + 1 < len(order_after) else None
        if nxt is not None:
            gap = html[e_:nxt]
            if gap.strip():
                errors.append(f"non-ws gap {sid} -> {order_after[idx + 1]}: {gap[:120]!r}")

    # 14. sticky CTA bar = [footer end, </main>)
    main_close = html.find("</main>", spans["footer_section"][1])
    sticky = html[spans["footer_section"][1]:main_close]
    if "<button" in sticky or "sticky" in sticky:
        write("sticky_cta_bar.html", sticky, "sticky WhatsApp + CTA bar inside <main>")
    else:
        errors.append(f"unexpected footer->main-close content: {sticky[:200]!r}")

    # app-shell facts for Layout/_document
    portal = re.search(r'<div id="portal"></div>', html)
    toastify = re.search(r'<div class="Toastify"></div>', html)
    build = re.search(r'"buildId":\s*"([^"]+)"', html)
    app_shell = {
        "parent_container_tag": pc.group(0),
        "main_open_tag": main_open.group(0).strip() if main_open else None,
        "main_close_pos": main_close,
        "portal_present": bool(portal),
        "portal_inside_parent_container": bool(
            portal and toastify and pc.start() < portal.start()
        ),
        "toastify_present": bool(toastify),
        "sticky_bar_id_hint": "wpt-sticky-cta-homepage-desktop",
        "build_id": build.group(1) if build else None,
    }
    (OUT / "app_shell.json").write_text(json.dumps(app_shell, indent=1), encoding="utf-8")

    # inline <style> + head meta (unchanged from prior pass)
    styles = [m.group(1) for m in re.finditer(r"<style[^>]*>(.*?)</style>", html, re.S)]
    (OUT / "inline_styles.css").write_text("\n\n/* ---- */\n\n".join(styles), encoding="utf-8")
    head = html[: html.find("</head>")]
    meta: dict[str, str] = {}
    for key, pat in {
        "title": r"<title[^>]*>(.*?)</title>",
        "description": r'<meta name="description" content="([^"]*)"',
        "canonical": r'<link rel="canonical" href="([^"]*)"',
        "og:title": r'<meta property="og:title" content="([^"]*)"',
        "og:description": r'<meta property="og:description" content="([^"]*)"',
        "og:image": r'<meta property="og:image" content="([^"]*)"',
        "robots": r'<meta name="robots" content="([^"]*)"',
    }.items():
        mm = re.search(pat, head, re.S)
        if mm:
            meta[key] = mm.group(1).strip()
    (OUT / "meta.json").write_text(json.dumps(meta, indent=1), encoding="utf-8")

    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=1), encoding="utf-8")
    bad = 0
    for name, info in manifest.items():
        flag = "" if info.get("balance") == 0 else "  <-- UNBALANCED"
        if flag:
            bad += 1
        print(f"{name:42} {info}{flag}")
    print(f"\nunbalanced: {bad}, errors: {len(errors)}")
    for e in errors:
        print(f"  ERROR: {e}")
    print(f"meta keys: {list(meta)}; styles blocks: {len(styles)}")
    return 1 if (bad or errors) else 0


if __name__ == "__main__":
    raise SystemExit(main())
