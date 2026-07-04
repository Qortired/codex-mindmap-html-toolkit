# Codex Mindmap HTML Toolkit

[English README](./README.md)

这是一个以 **Codex skill** 为核心的公开仓库候选版本。

本仓库的主内容是 `skills/mindmap-html-authoring`，用于把结构化 JSON 内容生成可交互、可离线打开的思维导图 HTML。围绕这个主 skill，还附带了两个配套工具：

- `tools/xmind-to-html`：把 `.xmind` 转成独立 HTML 查看页
- `tools/html-to-xmind`：把符合本项目契约的 HTML 恢复为 `.xmind`

## 理想使用方式

作者认为，这个 skill 最理想的使用途径，是把它作为一个由 Codex 驱动的自然语言工作流来使用：

1. 先用自然语言描述你想要的思维导图内容和结构；
2. 让 Codex 生成或修改一个可用、可定制的思维导图 HTML 文件；
3. 如果需要手工微调，再把该 HTML 转换为 `.xmind` 文件进行编辑；
4. 最后在需要移动阅读时，通过配套 APK 在安卓设备上查看。

也就是说，本项目想提供的不只是“文件互转”，而是一个从自然语言引导、到 Codex 辅助生成、再到按需进行 XMind 手工编辑、最后延伸到安卓阅读的完整链路。

## 主要定位

- 这是一个 **Codex 制作或在 Codex 协助下完成的 skill 项目**
- 主能力是生成和查看思维导图 HTML
- 提供受限的 `.xmind` 兼容导入/恢复链路
- 不是完整的思维导图编辑器

## 重要边界

- 本项目不是官方 XMind 项目
- 本项目与 Xmind / Supermind Pte. Limited 无隶属、无赞助、无背书关系
- `XMind` / `Xmind` 仅用于说明兼容目标
- 本仓库不包含 XMind 的全部功能
- 这是一个“生成 / 查看 / 恢复”工作流，不是完整编辑器
- 代码由 Codex 创建或深度协助完成，可能存在 bug，且可维护性可能不足
- 当前 viewer 和尺寸估算最初主要针对中文内容体验调过，因此英文纯内容的文字换行和宽度表现可能不如中文理想

## 兼容契约

`mindmap-html-authoring` 和 `xmind-to-html` 产出的 HTML 都依赖同一个核心契约：

```js
const IMG = [...]
const RAW_TREE = {...}
```

这使得 HTML 可以：

- 直接在浏览器中打开
- 保留完整层级
- 被 `html-to-xmind` 重新恢复为 `.xmind`

## 限制说明

- `html-to-xmind` 只支持带有 `IMG` 和 `RAW_TREE` 的兼容 HTML
- 不支持把任意普通 HTML 页面“识别”成思维导图
- 不保证完整保留主题、复杂样式、markers、notes、summaries、relationships、boundaries、多 sheet 等 XMind 能力
- APK 仅用于阅读，不具备编辑能力

## 法律与版权提醒

- 本仓库附带的免责声明与限制说明仅用于工程发布和风险提示，不构成法律意见
- 用户需要自行确保其处理的 `.xmind` 文件、HTML、图片、文本及其他素材拥有合法权利
- 仓库不应包含官方品牌图、logo、营销文案或未授权截图
