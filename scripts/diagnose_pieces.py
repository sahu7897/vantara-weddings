#!/usr/bin/env python3
"""Diagnose tag balance per extracted homepage piece (exact mismatch report)."""
from __future__ import annotations

import pathlib
from html.parser import HTMLParser

ROOT = pathlib.Path(__file__).resolve().parents[1]
HP = ROOT / "docs" / "research" / "homepage"

VOID = {
    "area", "base", "br", "col", "embed", "hr", "img", "input", "link",
    "meta", "param", "source", "track", "wbr",
}


class Diag(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.stack: list[tuple[str, int]] = []
        self.mismatches: list[str] = []
        self.void_seen: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag in VOID:
            return
        self.stack.append((tag, self.getpos()[0]))

    def handle_startendtag(self, tag: str, attrs) -> None:
        pass  # balanced by construction

    def handle_endtag(self, tag: int) -> None:
        if tag in VOID:
            return
        if self.stack and self.stack[-1][0] == tag:
            self.stack.pop()
        else:
            top = self.stack[-1] if self.stack else ("-", -1)
            self.mismatches.append(f"line {self.getpos()[0]}: </{tag}> but innermost open is <{top[0]}> (line {top[1]})")


def main() -> int:
    for f in sorted(HP.glob("**/*.html")):
        d = Diag()
        try:
            d.feed(f.read_text(encoding="utf-8"))
            d.close()
        except Exception as e:  # noqa: BLE001
            print(f"{f.name:45} PARSE ERROR: {e}")
            continue
        if not d.stack and not d.mismatches:
            print(f"{f.name:45} OK")
            continue
        unclosed = ", ".join(f"<{t}>@{ln}" for t, ln in d.stack[:6])
        print(f"{f.name:45} unclosed=[{unclosed}] mismatches={len(d.mismatches)}")
        for m in d.mismatches[:4]:
            print(f"    {m}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
