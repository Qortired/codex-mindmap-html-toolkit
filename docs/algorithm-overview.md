# Algorithm Overview

This staging repository centers on a Codex skill and two companion converters.

## Main flows

1. `mindmap-html-authoring`
   - Input: authoring JSON
   - Output: standalone HTML containing `const IMG = [...]` and `const RAW_TREE = {...}`

2. `xmind-to-html`
   - Input: `.xmind`
   - Output: standalone HTML viewer with the same payload contract

3. `html-to-xmind`
   - Input: compatible HTML containing `IMG` and `RAW_TREE`
   - Output: recovered `.xmind`

## Contract

The compatibility layer depends on two embedded JavaScript constants:

```js
const IMG = [...]
const RAW_TREE = {...}
```

`IMG` stores embedded image data URIs. `RAW_TREE` stores the normalized tree.

## Scope boundary

The recovery path does not try to infer a mind map from arbitrary HTML. It only
rebuilds `.xmind` files from HTML that carries the expected payload contract.
