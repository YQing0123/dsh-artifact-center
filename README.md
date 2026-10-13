# Artifact Center · 产物中心

> **DSH plugin** — index, browse, preview and open every artifact your sessions produced, **across all workspaces, by conversation**.
> **DSH 插件** — 自动索引所有工作区、所有对话产出的文件，按工作区/类型/标签分类，支持在线预览、打开方式与移入回收站。

[![status](https://img.shields.io/badge/status-design%20frozen%2C%20not%20implemented-orange)](#status)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
![topic](https://img.shields.io/badge/topic-dsh--plugin-informational)

---

## Status

| | |
|---|---|
| **Design** | ✅ Frozen (decisions D1–D10) |
| **Requirements** | ✅ Frozen (FR-A … FR-J, acceptance checklist) |
| **Implementation** | 🚧 **Not started** |
| **Published** | ❌ Not on npm yet |

This repository currently contains **design and handoff documentation only**. No plugin code is implemented yet.

> 本仓库当前**只有设计与交接文档**，尚未开始编码。

---

## Why

DSH users generate files constantly — Office documents, Markdown, HTML, images, archives — scattered across every workspace directory, with no unified entry point. Finding "the file that agent just made" means remembering a path.

**The key insight is that "artifact" is not the same as "a file in the workspace."**

On the reference machine, 8 workspaces hold **26,334 files** (`.svg` 12,221 · `.java` 2,528 · `.py` 2,319 · `.png` 1,781 · `.md` 1,142). The overwhelming majority are source code, dependencies and assets — **not conversation output**. A directory-first index would hand the user 99% noise.

> **Artifact = a file with conversation provenance.**
> The index key is `(workspace, session, turn, path)` — not `path`.

### How it differs from existing plugins

The ecosystem already has several *workspace file browsers* (`dsh-file-explorer-kit`, `@jaxzhou/dsh-file-explorer`, `dsh-fs-browser`, `@p-dsh-market/dsh-open-workspace`). They answer *"what files are in this workspace?"*

This plugin answers *"which conversation and which turn produced this file, and where is the one I'm looking for?"* — and it spans **all** workspaces, not one session's directory.

---

## Planned capabilities

- **Provenance index** across every registered workspace and every past conversation
- **Left-sidebar entry + global main panel** (works with no active session)
- Classify by **workspace / file type / tag**, plus recency and full-text search
- **In-panel preview, zero format conversion** — images, PDF, text/code/JSON/CSV, **rendered Markdown**, **Mermaid**, sandboxed HTML, audio/video
- Everything else (Office, archives, binaries) goes to **"Open with"** — the system's own applications
- **Move to Trash** (never hard-delete)
- Tags, favourites, notes, version folding, missing-file detection, list export
- **`artifact_search` agent tool** — so the model can find your artifacts too

### Explicitly out of scope

Any format conversion (including Office→PDF) · browsing *all* workspace files · hard delete · depending on any `@deepseek-ai/dsh-client-ui-*` package · file editing.

---

## Documentation

| Document | Contents |
|---|---|
| [`docs/plan.zh.md`](docs/plan.zh.md) | **Why** — field survey, locked decisions, architecture, implementation plan, risks |
| [`docs/requirements.zh.md`](docs/requirements.zh.md) | **What** — functional requirements FR-A…FR-J, non-functional requirements, data model, UI spec, **acceptance checklist** |
| [`docs/dev-notes.zh.md`](docs/dev-notes.zh.md) | **How not to break things** — DSH plugin rules, API cheat sheet, **22 known pitfalls**, debugging tools |

> The three documents are written in Chinese; they are the authoritative handoff package for the implementing model or developer.

---

## Planned repository layout

```
dsh-artifact-center/
├── package.json            # must declare dsh.bundle
├── cordis.patch.yml        # loader patch inserting the plugin row
├── index.js                # Host half (Node ESM)
├── client.js               # Browser half (self-contained ModuleLoader bundle)
├── lib/                    # build output + vendored runtime deps
├── locale/{en,zh}.json     # plugin card title & description
└── docs/
```

---

## Development

> ⚠️ **Read [`docs/dev-notes.zh.md`](docs/dev-notes.zh.md) first — the section on startup safety.**
> In DSH, all bundles activate in **one cordis tree**. Most entries may fail without stopping startup (they produce `warning: N entries did not activate`), but a failure in one of the **seven required entries** — `agent-loop`, `webserver`, `modules`, `connection`, `headless-runner`, `acp`, `sdk-jsonrpc-server` — or in the bootstrap Include is **fatal** and DSH will not start at all. Write defensively (see dev-notes §1.3) and always check the warning list after booting.

**Always verify in an isolated profile first:**

```bash
# install into a throwaway/CLI-controllable profile
dsh plugin --profile web add .

# boot a temporary instance to prove the plugin tree loads
# (note: `dsh web` already means `--profile web`; passing --profile again errors)
dsh web --port 0 --no-open
# success prints:  dsh web: http://127.0.0.1:<port>/?token=...
# also read the warnings: the list must NOT contain artifact-center

# uninstall if it breaks
dsh plugin --profile web remove dsh-artifact-center
```

The `desktop` profile is managed exclusively by the Electron app — CLI commands are refused for it, and plugins there are installed from the GUI market instead.

---

## Publishing

DSH has **no official plugin registry and does not accept external PRs**. The official guidance for plugin authors is to add the **`dsh-plugin`** topic to the repository:

**https://github.com/topics/dsh-plugin**

To also appear in the in-app market (which enforces a curated allow-list), a directory entry must be submitted to [`awesome-dsh-plugin`](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) as `data/plugins/<owner>__<repo>.yml`.

---

## License

[MIT](LICENSE)
