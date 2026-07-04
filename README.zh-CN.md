# Codex Mindmap HTML Toolkit

[English README](./README.md)

这是一个以 **Codex skill** 为核心的公开仓库候选版本。

本仓库的主内容是 `skills/mindmap-html-authoring`，用于把结构化 JSON 内容生成可交互、可离线打开的思维导图 HTML。围绕这个主 skill，还附带了两个配套工具：

- `tools/xmind-to-html`：把 `.xmind` 转成独立 HTML 查看页
- `tools/html-to-xmind`：把符合本项目契约的 HTML 恢复为 `.xmind`

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
