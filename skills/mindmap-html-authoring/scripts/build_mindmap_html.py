#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build a standalone mind-map HTML from an authoring JSON tree.

The output deliberately matches the xmind-mobile-view HTML contract:

    const IMG = [...]
    const RAW_TREE = {...}

That means the HTML can be opened directly in a browser and can also be
converted back to .xmind by the html-to-xmind project.
"""

from __future__ import annotations

import argparse
import base64
import json
import math
import mimetypes
import os
import uuid
from pathlib import Path
from typing import Any


SKILL_DIR = Path(__file__).resolve().parents[1]
ASSETS_DIR = SKILL_DIR / "assets"
VIEWER_CSS = ASSETS_DIR / "viewer.css"
VIEWER_JS = ASSETS_DIR / "viewer.js"


def calc_content_width(title: str, depth: int, image_width: int) -> int:
    font_size = {0: 16, 1: 14, 2: 13, 3: 13}.get(depth, 12)
    max_width = {0: 300, 1: 270, 2: 240, 3: 210}.get(depth, 190)
    min_width = {0: 120, 1: 100, 2: 85, 3: 75}.get(depth, 65)
    if title:
        cjk = sum(1 for char in title if "\u4e00" <= char <= "\u9fff")
        rest = len(title) - cjk
        text_width = min(cjk * font_size + rest * int(font_size * 0.55), max_width)
    else:
        text_width = 0
    return max(min_width, text_width, image_width or 0)


def estimate_node_size(title: str, depth: int, image_width: int, image_height: int) -> tuple[int, int]:
    content_width = calc_content_width(title, depth, image_width)
    node_width = content_width + 24
    if title:
        font_size = {0: 16, 1: 14, 2: 13, 3: 13}.get(depth, 12)
        line_height = max(18, math.ceil(font_size * 1.5))
        cjk = sum(1 for char in title if "\u4e00" <= char <= "\u9fff")
        rest = len(title) - cjk
        text_px_width = cjk * font_size + rest * int(font_size * 0.55)
        available_width = max(1, content_width - 12)
        lines = max(1, math.ceil(text_px_width / available_width))
        text_height = lines * line_height
    else:
        text_height = 0
    image_display_height = 0
    if image_width > 0 and image_height > 0:
        scale = min(1.0, content_width / max(1, image_width))
        image_display_height = math.ceil(image_height * scale) + 4
    return node_width, max(text_height + image_display_height + 16, 32)


def html_escape(value: Any) -> str:
    return (
        str(value)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def image_file_to_data_uri(path: Path) -> str:
    mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    data = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{data}"


def normalize_image_value(value: Any, base_dir: Path, images: list[str]) -> tuple[int, int, int] | None:
    """Return (image_index, width, height) or None.

    Accepted image forms:
    - {"data": "data:image/...", "width": 100, "height": 80}
    - {"src": "local/path.png", "width": 100, "height": 80}
    - "data:image/..."
    - "local/path.png"
    """
    if not value:
        return None

    width = 0
    height = 0
    source: str
    if isinstance(value, dict):
        width = int(value.get("width") or value.get("w") or 0)
        height = int(value.get("height") or value.get("h") or 0)
        source = str(value.get("data") or value.get("src") or "")
    else:
        source = str(value)

    if not source:
        return None
    if source.startswith("data:"):
        data_uri = source
    else:
        image_path = Path(source)
        if not image_path.is_absolute():
            image_path = base_dir / image_path
        data_uri = image_file_to_data_uri(image_path)

    try:
        index = images.index(data_uri)
    except ValueError:
        index = len(images)
        images.append(data_uri)
    return index, width, height


def normalize_node(node: dict[str, Any], depth: int, images: list[str], base_dir: Path) -> dict[str, Any]:
    """Convert authoring schema or RAW_TREE-like schema to RAW_TREE."""
    title = str(node.get("title", node.get("t", "")) or "")
    normalized: dict[str, Any] = {
        "i": str(node.get("id", node.get("i", "")) or uuid.uuid4()),
        "t": title,
    }

    image_value = node.get("image")
    if image_value is None and "p" in node:
        normalized["p"] = node["p"]
        normalized["pw"] = node.get("pw", 0)
        normalized["ph"] = node.get("ph", 0)
    else:
        image = normalize_image_value(image_value, base_dir, images)
        if image:
            index, width, height = image
            normalized["p"] = index
            normalized["pw"] = width
            normalized["ph"] = height

    link = node.get("link", node.get("lnk", ""))
    if link:
        link = str(link)
        normalized["lnk"] = link[7:] if link.startswith("xmind:#") else link

    image_width = int(normalized.get("pw", 0) or 0)
    image_height = int(normalized.get("ph", 0) or 0)
    normalized["w"], normalized["h"] = estimate_node_size(title, depth, image_width, image_height)

    children = node.get("children", node.get("c", [])) or []
    if children:
        normalized["c"] = [
            normalize_node(child, depth + 1, images, base_dir) for child in children
        ]
    return normalized


def load_authoring_json(path: Path) -> dict[str, Any]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError("Authoring JSON root must be an object")
    return data


def build_html(tree: dict[str, Any], images: list[str], title: str) -> str:
    css = VIEWER_CSS.read_text(encoding="utf-8")
    js = VIEWER_JS.read_text(encoding="utf-8")
    title_safe = html_escape(title)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=5,user-scalable=yes"/>
<title>{title_safe}</title>
<style>html,body{{user-select:none!important;touch-action:auto!important}}</style>
<style>{css}</style>
</head>
<body>
<div id="bar">
  <span id="bar-title">&#129504; {title_safe}</span>
  <input id="search" type="text" placeholder="&#128269; Search..." oninput="doSearch(this.value)"/>
  <span id="s-info"></span>
  <button class="btn" onclick="fitView()">Fit View</button>
  <button class="btn" onclick="expandAll()">Expand All</button>
  <button class="btn" onclick="collapseLevel(1)">Collapse to Level 1</button>
  <button class="btn" onclick="collapseLevel(2)">Collapse to Level 2</button>
  <button class="btn" onclick="goHome()">&#127968; Home</button>
  <span id="zoom-info">100%</span>
</div>
<div id="sidebar">
  <div id="sb-header">
    <span id="sb-count">0 results</span>
    <span id="sb-close" onclick="closeSidebar()" title="Close">✕</span>
  </div>
  <div id="sb-list"></div>
</div>
<div id="wrap">
  <div id="stage"><svg id="links"></svg></div>
</div>
<div id="tip">Left-drag background to pan · Middle-drag anywhere to pan · Wheel to zoom · Click a branch to expand or collapse</div>
<script>
const IMG={json.dumps(images, ensure_ascii=False)};
const RAW_TREE={json.dumps(tree, ensure_ascii=False)};
{js}
</script>
<div id="mzoom">
  <button onclick="zoomBy(1.4)" title="Zoom in">＋</button>
  <button onclick="zoomBy(0.7)" title="Zoom out">－</button>
  <button onclick="goHome()" title="Home" style="font-size:1rem">&#127968;</button>
</div>
</body>
</html>"""


def convert(input_path: Path, output_path: Path) -> None:
    authoring = load_authoring_json(input_path)
    images: list[str] = []
    tree_source = authoring.get("root", authoring)
    tree = normalize_node(tree_source, 0, images, input_path.parent)
    title = str(authoring.get("title") or tree.get("t") or output_path.stem)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(build_html(tree, images, title), encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build a viewer HTML mind map from JSON.")
    parser.add_argument("input", type=Path, help="Authoring JSON file")
    parser.add_argument("output", type=Path, help="Output HTML file")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    convert(args.input, args.output)
    print("[OK] " + str(args.output))


if __name__ == "__main__":
    main()

