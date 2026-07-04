---
name: mindmap-html-authoring
description: >
  Create high-quality standalone HTML mind maps from user-provided content using
  a strict schema compatible with xmind-mobile-view and html-to-xmind. Use when
  the user asks an AI to turn notes, articles, study material, outlines, PDFs,
  markdown, or any source content into a mind map HTML that should look and
  behave like the existing XMind-to-HTML viewer, or when the output must later
  be convertible back into an .xmind file. This skill defines the HTML mind map
  authoring standard: RAW_TREE/IMG payloads, hierarchy writing rules, image
  handling, internal links, and the builder script for generating the final
  viewer HTML.
---

# Mindmap HTML Authoring

Use this skill to author a mind map as structured data, then generate a
standalone HTML viewer with the same interaction quality as `xmind-mobile-view`.

The final HTML must contain:

```js
const IMG = [...]
const RAW_TREE = {...}
```

This contract lets the file:

- open directly as an interactive HTML mind map,
- preserve the full topic hierarchy,
- be converted back to `.xmind` by the HTML-to-XMind converter.

## Workflow

1. Read the user's source content and decide the map's root topic.
2. Write an authoring JSON tree using `title` and `children`.
3. Use stable `id` values only when internal links are needed.
4. Add images only when the user supplied or requested them; include width and
   height when known.
5. Run `scripts/build_mindmap_html.py` to generate the final HTML.
6. If the user also wants `.xmind`, convert the generated HTML with the separate
   HTML-to-XMind tool.

## Required Command

```powershell
python "<repo>/skills/mindmap-html-authoring/scripts/build_mindmap_html.py" input.json output.html
```

The builder embeds:

- `assets/viewer.css`,
- `assets/viewer.js`,
- normalized `RAW_TREE`,
- flat image array `IMG`.

## Common Pitfalls (read before authoring)

### ⚠️ #1 — Never put ASCII double quotes `"` inside JSON string values

This is the #1 cause of build failures, especially for Chinese content. A
`"title"` value that contains a raw `"` terminates the string early and breaks
JSON parsing (`Expecting ',' delimiter`).

- ❌ Wrong: `{ "title": "Understand the company's "focus areas"" }`  ← inner `"` breaks JSON
- ✅ Right: use typographic quotes in content → `{ "title": "Understand the company's “focus areas”" }`
- ✅ Also OK: escape them → `{ "title": "Understand the company's \"focus areas\"" }`

Rule: **inside any string value, the only allowed straight `"` are the two that
delimit the value itself.** For emphasis/quotation inside Chinese text use
`“ ”` `『 』` or `「 」`. For English use `' '` or escaped `\"`.

### #2 — Always validate JSON before building

Run a parse check first; it pinpoints the bad line instantly:

```bash
python3 -c "import json; json.load(open('input.json',encoding='utf-8')); print('JSON OK')"
```

### #3 — Don't let an auto-fixer convert structural quotes

If you batch-replace ASCII quotes with full-width ones, protect the JSON
*keys/structure* (`"title"`, `"children"`, `"root"`, `"id"`, `"link"`, etc.) so
only the *content* quotes get converted. A blind replace will corrupt
`"root":` into `“root”:`.

## Verified Build Workflow (copy this sequence)

This is the exact, tested order that builds cleanly on the first try:

```bash
# 1. Author input.json  (full-width quotes for all in-content quotation marks)

# 2. Validate + sanity-count nodes BEFORE building
python3 -c "import json; d=json.load(open('input.json',encoding='utf-8')); \
c=lambda n:1+sum(c(x) for x in n.get('children',[])); print('JSON OK, nodes:',c(d['root']))"

# 3. Build the HTML
python3 "<skill-dir>/scripts/build_mindmap_html.py" input.json output.html

# 4. Confirm RAW_TREE was embedded
grep -c "RAW_TREE" output.html      # expect >= 1

# 5. Optional completeness check: grep a few must-have keywords
#    for kw in keyword1 keyword2; do echo "$kw: $(grep -c "$kw" output.html)"; done
```

On Windows/PowerShell, replace `<repo>` with the absolute path to your local
repository checkout.

## Authoring Schema

Use this structure for the JSON input:

```json
{
  "title": "Map title",
  "root": {
    "title": "Root topic",
    "children": [
      {
        "title": "Branch",
        "children": [
          { "title": "Leaf" }
        ]
      }
    ]
  }
}
```

Optional node fields:

- `id`: stable node id.
- `image`: local path, data URI, or image object.
- `link`: target node id or `xmind:#target-id`.

Image object:

```json
{
  "title": "Node with image",
  "image": {
    "src": "relative-or-absolute-image.png",
    "width": 640,
    "height": 320
  }
}
```

## Mind Map Writing Rules

- Preserve all hierarchy in `children`; folded display is handled by the viewer.
- Keep one concept per node.
- Keep titles concise. Use child nodes instead of long paragraphs.
- Prefer 3-8 major branches under the root when the material allows.
- Use siblings for comparable concepts and children for explanation/detail.
- Put examples, exceptions, formulas, and caveats as child nodes.
- Use `link` only for cross-references, not for normal parent-child structure.
- Do not write arbitrary HTML DOM as the map source. The map source is the JSON
  tree that becomes `RAW_TREE`.

## Quality Target

The output should feel equivalent to a converted XMind HTML:

- toolbar, search, fold/expand, pan/zoom, and mobile gestures work,
- node hierarchy is complete,
- generated HTML is offline and standalone,
- HTML can be passed to HTML-to-XMind recovery without losing hierarchy.

## Detailed Spec

Read `references/authoring-spec.md` when:

- the map needs images,
- the map needs internal links,
- another AI needs the formal payload contract,
- you need examples of the authoring JSON schema.

