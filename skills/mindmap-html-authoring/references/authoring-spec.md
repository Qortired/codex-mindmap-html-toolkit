# Mindmap HTML Authoring Spec

Use this spec when writing an AI-authored mind map that must open with the same
viewer as `xmind-mobile-view` and remain convertible back to `.xmind`.

## Contract

The final HTML must contain exactly these JavaScript constants before the viewer
runtime starts:

```js
const IMG = [...]
const RAW_TREE = {...}
```

`RAW_TREE` is the full topic tree. `IMG` is a flat array of image data URIs.

The recommended workflow is to write an authoring JSON file first, then run
`scripts/build_mindmap_html.py` to generate the final HTML.

## Authoring JSON Schema

Use this friendly schema:

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

Optional fields:

- `id`: stable node id. If omitted, the builder creates one.
- `image`: an image object or string.
- `link`: an internal link target id or `xmind:#id`.

Image object:

```json
{
  "title": "Node with image",
  "image": {
    "src": "relative-or-absolute-file.png",
    "width": 640,
    "height": 320
  }
}
```

Data URI image:

```json
{
  "title": "Node with embedded image",
  "image": {
    "data": "data:image/webp;base64,...",
    "width": 640,
    "height": 320
  }
}
```

## RAW_TREE Schema

The builder converts authoring JSON into this compact viewer schema:

- `i`: node id.
- `t`: title text.
- `w`, `h`: estimated node size.
- `p`: index into `IMG`.
- `pw`, `ph`: image width and height.
- `lnk`: internal link target id.
- `c`: child nodes.

## Writing Rules

- Always preserve the complete hierarchy in `children`; do not omit lower levels
  just because the viewer initially folds deep nodes.
- Keep one concept per node.
- Prefer short node titles. Use children for explanation, not huge paragraphs.
- Use stable ids when you need internal links.
- Use `link` only for cross-references, not normal parent-child relations.
- Preserve image width/height when known; XMind recovery uses these dimensions.
- Do not put arbitrary DOM content in the HTML as the mind map source. The tree
  source is `RAW_TREE`, not visible HTML nodes.

## Quality Bar

A good generated map should:

- have a clear root topic,
- use balanced branches,
- avoid single chains when siblings would scan better,
- keep major categories within 3-8 top-level branches when possible,
- put definitions, examples, exceptions, and formulas as child nodes,
- include cross-links only when they add navigation value.

## Example

```json
{
  "title": "Revenue Recognition",
  "root": {
    "id": "root-revenue",
    "title": "Revenue Recognition",
    "children": [
      {
        "id": "five-step",
        "title": "Five-Step Model",
        "children": [
          { "title": "Identify the contract" },
          { "title": "Identify performance obligations" },
          { "title": "Determine the transaction price" },
          { "title": "Allocate the transaction price" },
          { "title": "Recognize revenue when obligations are satisfied" }
        ]
      },
      {
        "title": "Special Topics",
        "children": [
          { "title": "Principal versus agent" },
          { "title": "Variable consideration" },
          { "title": "Significant financing component" }
        ]
      },
      {
        "title": "Return to the five steps",
        "link": "five-step"
      }
    ]
  }
}
```

