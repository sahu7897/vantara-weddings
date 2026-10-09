#!/usr/bin/env python3
"""Stage 3e — Tailwind token gap analysis.

1. Collect every class token used in src/**/*.tsx (className attrs/expressions).
2. Collect every class defined in our CSS (dev-server style tags or built css).
3. Report used-but-undefined classes, and for each say whether the ORIGINAL
   capture CSS defines it (missing in our config = real gap) or not (dead class
   on both sides, e.g. font-plus-jakarta-sans).

Usage: python scripts/audit_tokens.py <our.css> [<our.css2> ...]
       (CSS text files; concatenate dev style tags first)
"""
import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
ORIG_CSS_DIR = Path(
    r"C:\Users\MODI\OneDrive\Desktop\vantaraweddings_webapp"
    r"\www.theweddingcompany.com\www.theweddingcompany.com\_next\static\css"
)

# Tokens that are not real CSS classes (transient values kept out on purpose).
IGNORE_TOKEN_RE = re.compile(r"^$")


def extract_class_tokens(tsx: str) -> set[str]:
    tokens: set[str] = set()
    # className="..." / className='...'
    for m in re.finditer(r"className\s*=\s*([\"'])(.*?)\1", tsx, re.S):
        tokens.update(split_classes(m.group(2)))
    # className={ ... } — scan the balanced brace block, then pull quoted strings
    for m in re.finditer(r"className\s*=\s*\{", tsx):
        i = m.end()
        depth = 1
        while i < len(tsx) and depth:
            if tsx[i] == "{":
                depth += 1
            elif tsx[i] == "}":
                depth -= 1
            i += 1
        block = tsx[m.end(): i - 1]
        for q in re.finditer(r"[\"'`]([^\"'`]+)[\"'`]", block):
            tokens.update(split_classes(q.group(1)))
    return {t for t in tokens if t and not t.startswith("${")}


CLASS_CHAR = re.compile(r"[A-Za-z0-9_:/.\[\]%()#,-]+$")


def split_classes(s: str) -> list[str]:
    """Split on whitespace NOT inside (), [] or {} (arbitrary values may contain
    spaces, e.g. bg-[linear-gradient(180deg, rgba(...))])."""
    out: list[str] = []
    buf: list[str] = []
    depth = 0
    for ch in s:
        if ch in "([{":
            depth += 1
        elif ch in ")]}":
            depth = max(0, depth - 1)
        if ch.isspace() and depth == 0:
            if buf:
                out.append("".join(buf))
                buf = []
        else:
            buf.append(ch)
    if buf:
        out.append("".join(buf))
    return out


def split_selectors(sel: str) -> list[str]:
    """Split a selector list on top-level commas only — commas inside (), []
    or escaped (\\,) are part of arbitrary values and must not split."""
    parts: list[str] = []
    buf: list[str] = []
    depth = 0
    esc = False
    for ch in sel:
        if esc:
            buf.append(ch)
            esc = False
            continue
        if ch == "\\":
            buf.append(ch)
            esc = True
            continue
        if ch in "([":
            depth += 1
        elif ch in ")]":
            depth = max(0, depth - 1)
        if ch == "," and depth == 0:
            parts.append("".join(buf))
            buf = []
        else:
            buf.append(ch)
    if buf:
        parts.append("".join(buf))
    return parts


def unescape_ident(name: str) -> str:
    """Undo CSS ident escaping: two-char escapes (\\: \\[ ...) and hex
    escapes with optional terminator space (\\2c  -> ',')."""
    out: list[str] = []
    i = 0
    n = len(name)
    while i < n:
        if name[i] == "\\" and i + 1 < n:
            m = re.match(r"[0-9a-fA-F]{1,6}", name[i + 1:])
            if m:
                hexpart = m.group(0)
                k = i + 1 + len(hexpart)
                if k < n and name[k] in " \t\n\r":
                    k += 1  # terminator space is not part of the name
                try:
                    out.append(chr(int(hexpart, 16)))
                except ValueError:
                    out.append(hexpart)
                i = k
                continue
            out.append(name[i + 1])
            i += 2
            continue
        out.append(name[i])
        i += 1
    return "".join(out)


# class selector body: idents, escapes (incl. hex with terminator space)
CLASS_BODY = re.compile(r"(?:\\(?:[0-9a-fA-F]{1,6}[ \t\n\r]?|[^0-9a-fA-F \t\n\r])|[A-Za-z0-9_-])+")


def defined_classes(css: str) -> set[str]:
    out: set[str] = set()
    # selectors before each {
    for sel in re.findall(r"([^{}]+)\{", css):
        for part in split_selectors(sel):
            part = part.strip()
            if part.startswith("@"):
                continue
            for m in re.finditer(r"\.", part):
                body = CLASS_BODY.match(part, m.end())
                if body:
                    out.add(unescape_ident(body.group(0)))
    return out


def main() -> None:
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)

    our_css = "\n".join(Path(p).read_text(encoding="utf-8") for p in sys.argv[1:])
    our_defined = defined_classes(our_css)

    orig_defined: set[str] = set()
    if ORIG_CSS_DIR.is_dir():
        for f in ORIG_CSS_DIR.glob("*.css"):
            orig_defined |= defined_classes(f.read_text(encoding="utf-8", errors="ignore"))

    used: set[str] = set()
    for f in SRC.rglob("*.tsx"):
        used |= extract_class_tokens(f.read_text(encoding="utf-8"))

    # Keep only plausible class tokens (drop URLs, prose fragments from strings).
    # Letterless tokens (":", "text-") are template-literal fragments, not classes.
    used = {
        t
        for t in used
        if CLASS_CHAR.match(t)
        and not t.startswith("//")
        and not t.endswith("-")
        and re.search(r"[A-Za-z]", t)
    }

    gaps = sorted(used - our_defined)
    real = [g for g in gaps if g in orig_defined]
    dead = [g for g in gaps if g not in orig_defined]

    print(f"used tokens: {len(used)}  defined(ours): {len(our_defined)}  defined(orig): {len(orig_defined)}")
    print(f"\n== REAL GAPS (used by us, defined by ORIGINAL — need config/CSS): {len(real)}")
    for g in real:
        print("  ", g)
    print(f"\n== DEAD CLASSES (used, defined by NEITHER — harmless no-ops): {len(dead)}")
    for g in dead:
        print("  ", g)


if __name__ == "__main__":
    main()
