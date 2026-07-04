# Compatibility and Limitations

## Supported workflow

- Author JSON with `mindmap-html-authoring`
- Generate standalone HTML containing `const IMG = [...]` and `const RAW_TREE = {...}`
- Recover a compatible `.xmind` file with `html-to-xmind`
- Convert `.xmind` to standalone HTML with `xmind-to-html`

## Important limits

- `html-to-xmind` supports only HTML that contains the expected `IMG` and `RAW_TREE` payload contract.
- Arbitrary HTML pages are out of scope.
- Full XMind round-tripping is not supported.
- Themes, rich styling, markers, notes, summaries, relationships, boundaries, and multi-sheet workbooks may be lost or unsupported.
- The APK is intended for reading only and does not provide editing features.
- The current viewer was originally optimized for Chinese-language display, so English-only mind maps may have less polished text sizing and wrapping.
