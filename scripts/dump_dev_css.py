#!/usr/bin/env python3
"""Fetch the dev homepage and dump all inline <style> contents to one CSS file."""
import re
import sys
import urllib.request
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
OUT = Path(__file__).resolve().parents[1] / "docs" / "research" / "homepage" / "our_dev_styles.css"

html = urllib.request.urlopen("http://localhost:3000/", timeout=60).read().decode("utf-8", "ignore")
styles = re.findall(r"<style[^>]*>(.*?)</style>", html, re.S)
OUT.write_text("\n".join(styles), encoding="utf-8")
print(f"styles: {len(styles)}  total bytes: {sum(len(s) for s in styles)}  -> {OUT}")
