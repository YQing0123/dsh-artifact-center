# 产物中心 · Artifact Center
### DSH 插件方案 v1.2 · 决策已冻结，等待编码

| | |
|---|---|
| **仓库** | https://github.com/YQing0123/dsh-artifact-center |
| **包名** | `dsh-artifact-center` |
| **中文名 / 英文名** | 产物中心 / Artifact Center |
| **状态** | 方案与需求已冻结；仓库已建（空）；**未开始编码** |

> **要解决的问题**：每次生成完文件后，想再找到它都很困难。
> **依据**：对本机 DSH 源码 checkout（0.1.7-rc.2）与真实运行数据（8 个工作区 / 289 份会话日志 / 26,334 个文件 / 142 个真实 turn）的实测勘察与量化验证。文中区分 **【实测】**、**【源码确认】**、**【待验证】**。

### 文档导航

| 文档 | 内容 | 什么时候读 |
|---|---|---|
| **本文件** `plan.zh.md` | 为什么这么做：现状勘察、决策、架构、实施计划、风险 | 想理解设计取舍时 |
| [`requirements.zh.md`](requirements.zh.md) | 做什么：功能需求 FR-A~FR-J、非功能需求、数据模型、界面规格、**验收清单** | **编码与验收的唯一依据** |
| [`dev-notes.zh.md`](dev-notes.zh.md) | 怎么不出事：DSH 插件开发规范、关键 API 速查、**22 条已知陷阱**、调试手段 | **动手写第一行代码前必读** |

## 变更记录

| 版本 | 变更 |
|---|---|
| v1.2 | **交接一致性校验**：① 统一 HTTP 路由前缀为 `/artifact-center/*`（原先 plan 用 `/artifacts/*`，与 dev-notes/requirements 不一致）；② 包形态改为**纯 JS、零构建**（根目录 `index.js` + `client.js`，去掉 `src/`、`tsconfig.json`、`tsdown.config.ts`、`lib/`），与 dev-notes §7.2 路线 A 对齐；③ 统一 P0 为**六条链路**并同步 requirements §9；④ 回填真实仓库地址与 awesome-dsh-plugin 条目路径 |
| v1.1 | 仓库创建（`YQing0123/dsh-artifact-center`）；拆分出需求规格与开发注意事项两份文档；统一文档名为 ASCII |
| **v1.0** | **决策全部锁定 + 插件命名**：Markdown/Mermaid 渲染保留；索引口径＝仅"对话产出"；回填全部 289 份历史会话；增加 `artifact_search` Agent 工具；`dsh-better-sidebar` 作可选预览增强；**定名 `dsh-artifact-center`（产物中心）** |
| v0.3 | 按用户决策调整：**① 取消一切格式转换（不做 Office→PDF）**，原生什么格式就展示什么格式，其余交给"打开方式"；**② 删除一律进回收站**，不提供硬删；**③ 遵守官方禁令**，不 import 任何 Harness Client 包；**④ 明确上架路径为 `dsh-plugin` topic 生态** |
| v0.2 | 补齐四路调查：预览能力边界、分发机制、数据模型、面板机制 |
| v0.1 | 首版方案 |

---

## 一、已锁定的决策（v1.0）

| # | 决策 | 对方案的影响 |
|---|---|---|
| **D1** | **不做任何格式转换**。原生输出什么格式就展示什么格式，其余一律走"打开方式"。**不转 PDF**。 | 移除 Office→PDF 整条链路与 `ctx.officeToPdf` 依赖；移除 LibreOffice kit 打包风险；P0 少一项验证；P3 工作量下降 |
| **D2** | **删除放到回收站** | 删除行为固定为"移入系统回收站 + 索引标记"，不实现硬删，风险等级从「不可逆」降为「可撤销」 |
| **D3** | **遵守官方禁令**：不 import `@deepseek-ai/dsh-client-ui-primitives` 等任何 Harness Client 包 | 控件全部自绘、渲染器自带；换来合规与升级稳定性，代价是多 1~2 天工作量 |
| **D4** | **上架到 `dsh-plugin` topic 生态**（github.com/topics/dsh-plugin） | 上架路径确定为：加 `dsh-plugin` topic + 向 awesome-dsh-plugin 目录提 PR |

| **D5** | **Markdown 与 Mermaid 渲染保留**（判定为浏览器显示行为，非格式转换） | 自带 markdown 渲染管线 + mermaid 懒加载，两者都是 v1 的必做项 |
| **D6** | **索引口径 = 仅"对话产出的文件"** | 不做"浏览工作区全部文件"的第二模式（2.6 万文件里 99% 是源码/依赖噪声）；保留 `add manually` 兜底 |
| **D7** | **首次回填全部 289 份历史会话** | 装完即可检索历史产物；后台异步 + 分片 + 进度条（一次性 10~60 s） |
| **D8** | **增加 `artifact_search` Agent 工具** | 模型可自主检索历史产物，形成"你不用找、Agent 替你找"的闭环 |
| **D9** | **`dsh-better-sidebar` 作可选预览增强** | 探测 `ctx.get('betterSidebar')`，存在则委托其 markdown/mermaid 渲染；非强依赖，不写进 peerDependencies 必需项 |
| **D10** | **插件定名 `dsh-artifact-center`**（zh：产物中心 / en：Artifact Center） | npm 未被占用【实测】；GitHub 同名仓库数 0【实测】 |

### 命名说明

| 项 | 取值 | 说明 |
|---|---|---|
| npm 包名 | `dsh-artifact-center` | 已查证未被占用 |
| GitHub 仓库名 | `dsh-artifact-center` | 建议与包名一致；已查同名仓库数 0 |
| 中文名 | 产物中心 | 界面与市场卡片显示 |
| 英文名 | Artifact Center | |
| cordis 插件 id | `artifact-center` | 用在 `cordis.patch.yml` 与左侧栏 panellist `id` |
| `main` slot key | `artifact-center` | 必须与 panellist `id` 完全一致 |

**为什么不用别的名字**：
- ❌ `dsh-artifact` 已被占用（0.8.1），且语义**不同**——它是"用 `artifact` 工具生成自包含 HTML/幻灯片"的**创作工具**，我们是**浏览与检索器**。加 `-center` 既避开冲突，也准确表达了"中心/仓库"的定位。
- ❌ `dsh-file-explorer` 一类命名会与已有 5+ 个"工作区文件浏览器"混为一谈，丢失"跨工作区 · 按对话归档"的差异化。
- ✅ `dsh-artifact-center` 在市场搜索 "artifact" 时可命中，且与中文名"产物中心"一一对应。

> **仓库已建**：`https://github.com/YQing0123/dsh-artifact-center`。awesome-dsh-plugin 的条目路径为 `data/plugins/YQing0123__dsh-artifact-center.yml`（尚未提交 PR；仓库需先加 `dsh-plugin` topic 并满 1 天）。

---

## 二、结论摘要

1. **需求成立，但索引范式必须换。** 不是"工作区文件浏览器"，而是**按对话血缘（provenance）索引的产物库**。实测：8 个工作区共 **26,334 个文件**，其中 `.svg` 12,221、`.java` 2,528、`.py` 2,319、`.png` 1,781、`.md` 1,142 —— 目录优先的索引会把 99% 的噪声端给用户。

2. **DSH 已经给了大部分底层能力，不需要重造。** 会话查询 `ctx.sessionQuery`、工作区注册表 `ctx.workspaceRegistry`、文件字节自建路由、系统级"打开方式"、左侧栏面板 slot、storageDomain 持久化 —— 全部现成。

3. **但没有任何单一数据源能撑起"产物索引"【实测】**。对 289 份真实会话日志统计：

   | 工具 | 调用次数 | 事件里带文件路径 |
   |---|---|---|
   | `bash` | **7,107** | ❌ 只有命令字符串 |
   | `edit` | 1,439 | ✅ `file_path` |
   | `write` | 345 | ✅ `file_path` |
   | `present` | 80 | ✅ 显式声明（但仅 **11.4%** 的日志有 `deliverables/presented` 事件） |

   官方 `ctx.workspaceChanges`（"本轮变更文件"）**只在 Host 内存里，Session 一 dispose 就没了**，重启后历史轮次无摘要 —— 不能作为索引基座。

4. **本方案的核心技术支点（已量化验证）**：在**每轮 `turn/end` 时对工作区做一次全量 stat 快照并 diff**。实测 26,334 个文件的完整 stat 遍历只要 **0.37 秒**。在 12 个大会话 / 142 个真实 turn 上的验证结果：

   | 指标 | 实测值 |
   |---|---|
   | 常规轮（141 个）中被快照捕获的文件次数 | 149 |
   | 其中 `write`/`edit` **完全覆盖不到**的比例 | **93%**（139/149） |
   | 单轮产出的中位数 | 2 个文件 |
   | 单轮产出最多（常规轮） | 89 个文件 |
   | 异常爆量轮 | 1 轮捕获 **13,090** 个文件（占该工作区 100%，疑似 `npm install` / 批量生成） |

   → **快照 diff 是唯一能看见 bash/MCP 产出的手段，且性能完全可接受**；同时必须做**噪声治理**（单轮上限 + 爆量折叠）。

5. **生态里已有 5+ 个"工作区文件浏览器"，没有一个做"跨工作区 + 按对话归档的产物库"。** 这就是差异化定位。

6. **两个必须提前对冲的硬约束**：
   - DSH 的 `ctx.fs` **没有删除 API**【源码确认，已穷举契约】→ 删文件只能走 `ctx.subprocess.spawn([...])`，**绕过 DSH 审批体系**，因此按 D2 一律用"移入回收站"语义，避免不可逆操作。
   - **原生预览器全是 session 右栏专属、且第三方不可 import**【源码确认】→ 全局面板读文件字节必须**自带 Host 侧 `webServer` 路由**，不能用 `workspaceFiles` Remote（每个方法都要 `sessionId`）。

7. **发布目标的认知必须先纠正**【源码确认】：DSH 官方仓库**既没有插件库，也不接受外部 PR**（`CONTRIBUTING.md`：*"we cannot accept external pull requests at the moment"*）。官方给插件作者的唯一指引就是**给 GitHub 仓库加 `dsh-plugin` topic**（正是 D4 指定的 `github.com/topics/dsh-plugin`）。用户口中的"官方插件库"实际是 **dshmarket 的目录源**，而目录 = **awesome-dsh-plugin** 的人工策展白名单。**上架 = 加 topic + 向那个仓库提一个 `data/plugins/<owner>__<repo>.yml` 文件的 PR**，通常一天内被市场收取。

---

## 三、现状勘察

### 3.1 本机规模【实测】

| 项目 | 实测值 |
|---|---|
| 已注册工作区 | 8 个 |
| 工作区文件总数（排除 node_modules/.git 等） | **26,334** |
| 全量 stat 遍历耗时 | **0.37 s** |
| 会话日志目录数 | **289** |
| 单会话最大事件数 | 1,289 行 |
| 会话日志格式 | **zstd 压缩的 JSONL**（`session.v4.jsonl.zstd`） |

各工作区体量：`plane` 13,090 / `赣数通2.0` 5,184 / `apione-batch-tool` 3,335 / `data-dev-space` 2,438 / `鸣谦知识库` 1,390 / `knowledge-SAG` 679 / `router` 97。

**产品含义**：2.6 万文件远超可浏览量级，必须靠"对话血缘 + 分类树 + 检索"三重收窄；而"全量扫描"性能上可接受（亚秒级），不必为省性能牺牲覆盖率。

### 3.2 DSH 现有可复用能力盘点

| 能力 | 接口 | 对我们的价值 | 局限 / 决策 |
|---|---|---|---|
| 工作区注册表 | `ctx.workspaceRegistry.list()` → `{id, path, title, sessionIds}` | 分类树的"按工作区"根节点 | 只列已注册工作区 |
| 统一会话查询 | `ctx.sessionQuery.listSessions()` / `listEvents(id)` / `readTitleSnapshots(ids)` | **枚举全部会话 + 读事件 + 取对话名**，不必自己解 zstd | `listEvents` 完整回放日志，历史大时慢 |
| 显式交付事件 | `deliverables/presented` = `{turn, callId, files:[{path, description}]}` | **永久**、最精确、自带说明文字 | 覆盖率仅 11.4% |
| 本轮变更文件 | `ctx.workspaceChanges.summary(sessionId, seq)` | live 会话实时补充（含 git 行数） | **不持久化**，dispose/重启即消失 |
| 工作区文件 Remote | `ctx.workspaceFiles.read/readBytes/stat/list/changes`（scope 需 `sessionId`） | 有 session 时取字节 | **无 session 用不了；无删除** |
| Office→PDF | `ctx.officeToPdf.convert(request)` | ~~Office 预览~~ | **按 D1 不使用** |
| 打开方式 | `ctx.sessionController.openWorkspacePath({path, action?, application?})` + `workspacePathApplications({path})` | **D1 之后，这是所有非原生格式的统一出口** | 经 `remote.session` 调用时有 session 前提；无 session 需自建路由 + `native-command` |
| 原生文档预览 | `ui-sidebar-documentpreview`：text/md/html/图片/PDF/代码/Office | 预览能力比预期强 | **全部 `scope:'session'`**，第三方**不可 import** |
| 左侧栏面板 | `sidebar.panellist`（list，`{id, order, label}`）+ `main`（keyed）+ `ctx.layout.selectPanel(id)` | **插件进入左侧菜单的标准做法** | `main.key` 与 panellist `id` 必须成对注册 |
| 持久化 | `ctx.storageDomain.open(spec)`（zod 校验，`single`/`per-record`） | 索引落库的正规做法 | — |
| 主题 token | `--dsw-alias-*` | 与宿主浑然一体 | **按 D3 禁止 import 任何 `@deepseek-ai/dsh-client-ui-*`** |

### 3.3 生态竞品盘点【实测，npm】

| 插件 | 定位 | 与我们的关系 |
|---|---|---|
| `dsh-file-explorer-kit` | 浏览**当前会话**工作区 + md/图片/PDF 预览 | 目录优先、单会话 → 不重复 |
| `@jaxzhou/dsh-file-explorer` | 工作区文件浏览器 + 每格式预览 | 同上 |
| `dsh-fs-browser` | 右侧栏文件列 + Shiki 预览 | 同上 |
| `@p-dsh-market/dsh-open-workspace` | 悬浮层级目录 + md/code/html 预览 + 终端 | 同上 |
| `@benz-ai-x/dsh-md-preview` | 对话里点 md 打开右侧渲染预览 | 可共存 |
| `dsh-artifact` | **另一语义**：`artifact` 工具写自包含 HTML/幻灯片 + 右栏 tab | 命名需避让 |
| `dsh-better-sidebar`（本机已装） | VSCode 式右栏，暴露 `ctx.betterSidebar.registerFileViewer` | **最佳协同对象**（可选增强） |

> **差异化结论**：现有插件都在回答"这个工作区里有哪些文件"，我们要回答"**这些文件是哪个对话、哪一轮产出的，我要找的那份在哪**"。

### 3.4 关键结论

> **产物 = 「有对话血缘的文件」**，而不是「工作区里存在的文件」。
> 索引主键是 `(workspaceId, sessionId, turn, path)`，不是 `path`。

---

## 四、需求确认与补充建议

### 4.1 原始需求逐条确认

| # | 需求 | 可行性 | 说明 |
|---|---|---|---|
| R1 | 自动索引**所有工作区**所有对话的输出产物 | ✅ | `workspaceRegistry` + `sessionQuery` + 快照 diff |
| R2 | 左侧有菜单入口 | ✅ | `sidebar.panellist` + `main`，`ctx.layout.selectPanel` |
| R3 | 左侧分类：按工作区 / 类型 / 标签 | ✅ | 标签需自建存储（DSH 无标签概念） |
| R4 | 右侧列表：文件名 / 工作区 / 类型 / 标签 / 所属对话 | ✅ | 对话名取 `sessionQuery.readTitleSnapshots()` |
| R5 | 打开方式参考 DSH 自带的打开方式选择 | ✅ | 复用 `openWorkspacePath` / `workspacePathApplications`；**D1 后它是非原生格式的统一出口** |
| R6 | 支持删除文件 | ✅ | **按 D2 固定为"移入回收站"** |
| R7 | 在线预览 + 区分"要装插件才能预览的" | ✅ | 见 5.3（已按 D1 收窄） |

### 4.2 建议补充的需求（13 项）

**A. 让"找得到"真正成立**

1. **全文检索**：文件名 + 内容（md/txt/html/csv/json 抽文本）。
2. **重复/版本聚合**：同一路径被多轮生成 → 折叠成一条，展开看版本时间线。本机 `outputs/pixso-import-2026-09-30` 这类反复重跑的场景必须有。
3. **失效检测**：文件被删/改名/移动后标记 `missing`，提供"清理失效条目"。
4. **Agent 触点（强烈建议）**：注册 `artifact_search` 工具，让模型也能检索历史产物 —— **你不用找，Agent 替你找**，所有竞品都没有这个能力。
5. **清单导出**：筛选结果导出 md/csv，可直接粘回对话继续干活。

**B. 让"用起来顺手"**

6. **默认首页 = 最近产物时间线**（近 7 天所有工作区）。
7. **收藏 / 置顶 / 备注**。
8. **标签自动规则**：按目录 / 扩展名 / 对话自动打标（`outputs/**` → 交付物）。
9. **"本轮 / 本会话产物"快捷视图**（官方 Turn Deliverables 卡片的全局版）。
10. **在文件管理器中显示**（`action:'reveal'`）。
11. **忽略规则可配置**：默认排除 `.git / node_modules / dist / build / .next / __pycache__ / .venv / target`。

**C. 工程与体验**

12. **爆量轮治理（由实测数据倒逼出的需求）**：单轮变更超过阈值（如 500）时**折叠为"批量产出（13,090 个文件）"一条**，展示目录分布摘要，而不是把 1.3 万条塞进列表。
13. **后台索引 + 进度提示**：首次回填 289 份会话可能耗时，必须异步、可中断、有进度。

---

## 五、产品设计

### 5.1 入口与信息架构

```
左侧栏（sidebar.panellist）
  └─ [产物中心] 图标 ──点击──▶ ctx.layout.selectPanel('artifact-center')

主面板（main slot，key = 'artifact-center'，root scope，无 session 也可用）
  ├─ 顶部：搜索 · 时间范围 · 视图切换 · 索引状态/刷新
  ├─ 左列（可折叠）分类树
  │    ├─ 全部产物（默认）        ├─ 最近（今天 / 7 天 / 30 天）
  │    ├─ 按工作区 ▸ 8 个         ├─ 按类型 ▸ 文档/表格/演示/图片/网页/数据/代码/媒体/压缩包
  │    ├─ 按标签 ▸ 用户 + 自动    └─ 收藏 / 失效
  └─ 右列：产物列表（虚拟滚动）+ 预览抽屉
```

### 5.2 列表列与操作

| 列 | 来源 | 备注 |
|---|---|---|
| 文件名 | 快照 diff / 事件路径 | 点击=预览；带来源角标 |
| 工作区 | `workspaceRegistry` | 可点击筛该工作区 |
| 类型 | 扩展名 + MIME 推断 | 彩色文件类型图标 |
| 标签 | 自建存储 | 可内联增删 |
| 所属对话 | `sessionQuery.readTitleSnapshots()` | 悬停显轮次/时间，可跳回该对话 |
| 来源 | present / write / edit / 快照 / 手动 | **信任度可视化**：present=显式交付，快照=推断 |
| 大小 / 时间 | `stat` | |

**操作菜单**：`预览`（仅原生可显示的格式出现）· `用默认程序打开` · `用其他应用打开 ▸` · `在文件管理器中显示` · `复制路径` · `复制为 Markdown 链接` · `收藏` · `打标签` · `查看所属对话` · `移入回收站` · `在文件夹中定位所属对话产物`。

### 5.3 预览策略（按 D1 收窄后）

**原则：原生输出什么格式就展示什么格式。不为预览做任何格式转换，不做 Office→PDF。面板内显示不了的格式，一律交给"打开方式"。**

| 处理方式 | 文件类型 | 实现 |
|---|---|---|
| **面板内直接显示**（零转换） | 图片 png/jpg/gif/webp/bmp/svg/ico | `<img>` + 缩放灯箱。svg 走 `<img src>` 避免 XSS，不内联 SVG |
| | **PDF**（本来就是 PDF，非转换产物） | Host 字节路由 + `<embed>`，用浏览器自带 PDF 阅读器 |
| | 纯文本 / 代码 / json / yaml / 日志 / csv / tsv | 文本视图；csv 以表格呈现（解析，不改文件） |
| | **Markdown**（渲染展示，非格式转换） | 自带渲染管线（见下）+ DOMPurify |
| | **Mermaid mmd**（渲染展示，非格式转换） | 自带 mermaid，懒加载 |
| | HTML | 沙箱 iframe + CSP + DOMPurify（只读，限大小） |
| | 音视频 | `<audio>` / `<video>` + Range |
| **不预览，走"打开方式"** | Office：doc/docx/xls/xlsx/ppt/pptx | `openWorkspacePath` → 系统默认程序 / WPS / Office；**不转换** |
| | 压缩包 zip/tar/gz | 同上（可只显示元数据） |
| | 二进制 / 未知 / 超大文件 | 同上 |

**"哪些要装插件才能预览"的答案**：
- **Office / xlsx / 压缩包：产物中心不预览**（D1），直接用系统打开方式——你机器上该有什么程序就用什么程序；
- **Markdown 美化（含 mermaid 围栏、KaTeX 公式）、代码高亮：可选增强 `dsh-better-sidebar`**（本机已装，暴露 `ctx.betterSidebar.registerFileViewer`），存在则委托它的渲染栈；
- **产物中心自身零强依赖**：自带 markdown + mermaid + 轻量代码高亮即可独立工作。

**依赖清单（按 D3，全部自带，不 import Harness 包）**：

| 用途 | 方案 |
|---|---|
| Markdown | 自带 markdown-it（或 micromark）+ DOMPurify |
| 代码高亮 | 自带轻量 tokenizer 或按需 shiki；shiki 体积大 → 懒加载 + 按语言分包 |
| Mermaid | 自带 `mermaid`，仅在打开 mmd/md 含围栏时懒加载（生产环境 DSH 完全没有打包 mermaid） |
| HTML 沙箱 | 自带 DOMPurify + CSP 白名单 |
| PDF | 浏览器原生 `<embed>`，**不引入 pdfjs**（零转换、零解析） |
| CSV/TSV | 自带小解析器（远小于 papaparse 也可以接受） |
| 音视频 | 原生标签 |

> **可选增强的探测方式**：`ctx.get('betterSidebar')` 存在则注册委托 viewer，不存在则用自己的渲染器。非强依赖，不写进 `peerDependencies` 的必需项。

### 5.4 关键交互

- **删除**：见 6.6，固定"移入回收站"。
- **标签**：输入即建、多选筛选、可保存当前筛选为智能标签。
- **版本聚合**：同一 `path` 多条记录折叠，标题右显 `×3`，展开看各版本（时间/大小/来源对话）。
- **爆量轮**：折叠为一张"批量产出"卡片（如 `npm install` 产生的 13,090 个文件），可展开但默认不摊平。
- **空态 / 首次进入**：显示索引进度条，已索引部分先可见，不阻塞浏览。

---

## 六、技术设计

### 6.1 总体架构

```
┌────────────────────── Host 半边（Node，插件主入口） ──────────────────────┐
│  ArtifactIndex（Service）                                                 │
│   ├─ 回填器 Backfill   ── ctx.sessionQuery.listSessions/listEvents/readTitle│
│   ├─ 实时器 Live       ── session/event 监听（tool/call·turn/end·presented）│
│   ├─ 快照器 Snapshots  ── turn/end 时 stat 快照 diff（★核心，覆盖 bash）    │
│   ├─ 校检器 Reconciler ── stat 校验 missing / size / mtime                  │
│   └─ 存储 Store        ── ctx.storageDomain（zod，per-record 布局）         │
│  Remote API：list / search / tags / star / trash / reveal / open            │
│  ★ Web 路由（必须）：/artifact-center/api、/artifact-center/file（字节流） │
│  （可选）工具：artifact_search → 让 Agent 也能检索历史产物                   │
└──────────────────────────────────────────────────────────────────────────┘
                              ▲ Remote / fetch
┌────────────────────── Client 半边（React，slot 注册） ────────────────────┐
│  sidebar.panellist 入口图标  +  main slot 主面板（root scope，无 session 可用）│
│  分类树 / 虚拟滚动列表 / 预览器 / 打开方式菜单 / 标签编辑 / 回收站确认        │
│  样式：只用 --dsw-alias-* token + CSS Modules（D3：不 import Harness 包）    │
└──────────────────────────────────────────────────────────────────────────┘
```

> **为什么必须有自带 Web 路由**【源码确认】：`workspaceFiles` 的 `read/readBytes/stat/changes` **每个方法都要 `sessionId`**；`dsh-resource://file/absolute/…` 也"carries no Session and cannot authorize a Host call"。全局面板没有 session → **没有别的办法拿到字节**。`dsh-better-sidebar` 正是这么做的（`/sidebar/file` 媒体路由，含 content-type 与大小上限）。

### 6.2 数据源四层血缘

| 层 | 数据源 | 覆盖 | 持久性 | 角色 |
|---|---|---|---|---|
| **L1 回填** | `sessionQuery.listEvents(id)` 抽 `write`/`edit`/`str_replace_editor` 的 `file_path`（复用官方 `mutationPath` 逻辑） | 中 | 永久（日志） | **历史基线**：装插件之前的产物 |
| **L2 显式交付** | `deliverables/presented` = `{turn, callId, files:[{path, description}]}` | 低（11.4%） | 永久 | **最高信任度** + 说明文字 |
| **L3 快照 diff ★** | `turn/end` 时全量 stat 快照与上一轮 diff | **高（含 bash/MCP）** | 我们自持久化 | **主力**，实测 93% 的产出只有它能看见 |
| **L4 实时补充** | `ctx.workspaceChanges.summary()`（git 精确 diff，含行数） | 中 | 仅 live | 有 git 时叠加行数 |

**为什么 L3 是核心**【实测】：官方 `workspace-changes` 在无 git 仓库时只覆盖 `write`/`edit`，**明确不含 shell 产物**；而 7,107 次 bash 调用正是 Office 文档、HTML 归档、SVG 批处理的主要生成方式。实测完整 stat 遍历 26,334 文件 **0.37 s**，在每轮 `turn/end` 做一次完全可接受；142 个真实 turn 的验证显示 **93% 的产出是 write/edit 完全看不见的**。

**路径解析规则**（官方 `present-open.ts` 同款）：事件里的路径可能是相对路径，必须用该 session header 的 `cwd` 解析为绝对路径后再 `stat`；解析失败或文件不存在 → 标记 `missing`，**不删除记录**。

### 6.3 索引引擎流程

```
插件启动
 ├─ 读持久化索引（storageDomain，per-record）
 ├─ 校检：批量 stat 已有条目 → 更新 missing/size/mtime
 └─ 回填：listSessions() →（并发 2~4，可中断）逐会话 listEvents → 抽 L1/L2
      └─ readTitleSnapshots(ids) 批量补对话名；全程上报进度

运行中
 ├─ session/event[tool/call] name ∈ {write,edit,str_replace_editor} → 记 pending 路径
 ├─ session/event[deliverables/presented] → 直接落库（高信任）
 ├─ turn/end → 该 cwd 工作区快照 diff → 过滤忽略规则 → 超阈值折叠为"批量产出" → 落库
 ├─ workspace/changes 事件 → 有则叠加 git 行数
 └─ 防抖 2~5 s 批量写盘；崩溃后从最后 cursor 续跑
```

**性能预算**：单轮快照 0.37 s（26k 文件）；289 份日志回填约 10~60 s → 后台 + 分片 + 进度条。

**已知的归因局限（必须如实呈现）**：快照 diff 是**时间窗推断**，无法区分"模型写的"与"同一时间窗内用户或其他进程改的"。对策：来源徽章区分信任度（present > write/edit > 快照），并提供手动纠正/解绑。

### 6.4 持久化

用 DSH 自带的存储设施，不裸写文件（与官方 `packages/workspace/workspace/src/spec.ts` 同款写法）：

```ts
const artifactDomainSpec = {
  name: 'artifact-center',   // → ~/.dsh/storages/artifact-center（per-record）
  version: 1,
  layout: 'per-record',      // 记录多且大，per-record 更稳、可单独丢弃
  invalidRecords: 'backup-and-skip', // 索引是派生数据，坏记录不阻塞整库
  tables: { artifacts: {...}, tags: {...}, snapshots: {...} },
}
// await ctx.storageDomain.open(artifactDomainSpec)
```

**数据模型（草案）**：

```ts
interface ArtifactRecord {
  id: string                  // hash(workspaceId + path)
  workspaceId: string
  sessionId?: string          // 归属对话
  sessionTitle?: string       // 冗余存一份，避免每次读日志
  turn?: number
  path: string                // 绝对路径
  relPath?: string
  ext: string
  kind: 'doc'|'sheet'|'slide'|'image'|'web'|'data'|'code'|'media'|'archive'|'other'
  size?: number; mtime?: number
  source: 'present'|'write'|'edit'|'snapshot'|'manual'
  description?: string        // present 自带
  firstSeenAt: number; lastSeenAt: number
  versions?: { turn: number; sessionId: string; time: number; size: number }[]
  missing?: boolean; tags?: string[]; starred?: boolean; note?: string
  trashed?: boolean           // D2：删除即打标，记录保留
  burst?: boolean             // 爆量轮聚合标记
}
interface WorkspaceSnapshot {  // L3 的库存：path → [mtimeNs, size]
  workspaceId: string; takenAt: number
  entries: Record<string, [number, number]>
}
```

> **官方实践明确**："会话日志是唯一真源，插件记忆是派生缓存"。因此索引文件损坏/丢失都必须**可重建**（重建 = 重跑回填），且**绝不能**向会话日志追加自定义事件类型（会导致会话无法重开）。

### 6.5 Client 侧要点

```ts
// 入口图标（root scope，无 session 也渲染）
ctx.slots.inject('sidebar.panellist', () => ctx.slots.register(
  { name: 'sidebar.panellist', id: PANEL_ID, order: 60, label: () => t('panel') }, ArtifactsIcon))
// 主面板（root scope）
ctx.slots.inject('main', () => ctx.slots.register(
  { name: 'main', key: PANEL_ID }, ArtifactCenterPage))
// 外部跳转（让对话里的产物卡片直接跳进来）
ctx.reflect.provide('artifactNavigation', { open: (f) => ctx.layout.selectPanel(PANEL_ID) })
```

- 模板参照：`packages/client/ui-schedule/src/client/index.ts`（最干净的 panellist + main 范例）、`ui-plugin-manager`（管理列表样式基准）；
- **D3 硬约束**：不 `require` 任何 `@deepseek-ai/dsh-client-ui-*`；控件（Button/Modal/Tag/Tooltip/Menu/Toast/开关）按官方 primitive 的 markup + 行为**自绘**，只引用 `--dsw-alias-*`；清单虚拟化自己实现（框架**没有**共享虚拟列表/树组件）；复制行为要保留官方依赖的用户预期（Modal 焦点与 Escape、`role="switch"` + `aria-checked`、Tooltip 定位）；
- 浏览器半边产物必须是 `window.__ModuleLoader__.load({ id: '<包名>', factory(require) {...} })` 格式，id 必须等于包名。

### 6.6 删除（按 D2：固定移入回收站）

**事实**【源码确认】：`ctx.fs` 契约里**没有** `remove/unlink/rm/delete`（已穷举）。仓库内唯一的 `rm` 是 fs-local 原子写的内部实现，非公开 API。

**实现**：

```
移入回收站（macOS）：osascript -e 'tell application "Finder" to delete POSIX file "<abs>"'
                   跨平台回退：Linux 用 gio trash / Windows 用 PowerShell 回收站 API
调 用 方 式：ctx.subprocess.spawn({ argv, cwd: workspaceRoot, stdio, graceMs, signal })
```

**已在本机实测通过**【实测】：`osascript` 退出码 0、源文件消失、`~/.Trash` mtime 更新 → 移入回收站可用，无额外授权弹窗。

⚠️ **同时实测到一个必须规避的坑**：macOS TCC 保护 `~/.Trash`，**Host 进程读不了它**（`fs.readdir` 抛 `Operation not permitted`；`ls` 只返回 `total 0`，**看起来像成功实为被静默过滤**）。所以：
- 删除的成功判据只能是「**退出码 0 且源路径已不存在**」，**不要**去列回收站校验；
- 插件内不做"从回收站恢复"，只提示用户自行取回（见下方第 4 条）。

**安全设计**：
1. **行为固定为回收站**，不提供硬删入口（减少误操作面）；
2. 删除前展示完整路径、大小、所属对话、是否被多轮/多版本引用（多引用时提示"将一并移入回收站"）；
3. 二次确认（参照官方 `RiskConfirmation` 交互自绘）；
4. 删除后**索引标 `trashed`，记录保留**，提示"可从系统回收站取回；取回后重新校检即可复原索引状态"（**不由插件读回收站实现恢复**）；
5. 沙箱模式（`workspace-write`）下工作区外路径可能被拒 → **必须有失败回执与提示，不能静默失败**。

> 按 D2 调整后，本插件**不再有不可逆操作**，方案最大风险项消解。

### 6.7 Agent 触点（差异化闭环）

```
artifact_search(query, workspace?, type?, tag?, since?, limit?)
  → [{ name, path, workspace, type, sessionTitle, turn, time, size, preview }]
```

用户"找不到文件"时可以直接问 Agent"上周那份关于支付的方案在哪"，Agent 用同一份索引回答。**所有竞品都没有这个能力。**

### 6.8 i18n 与配置

- `locale/en.json` / `locale/zh.json`，内容 `{"meta":{"title":…,"description":…}}`，并在 `exports` 暴露 `"./locale/*.json"`；
- **注意**：DSH 官方仓库里的 `.i18n.yaml` 是**它自己文档配对校验用的**，与插件分发**毫无关系**，不要生成【源码确认】；
- 插件自身 UI 文案走 `@deepseek-ai/dsh-client-locale`（在 `dsh.client.inject` 声明）；
- `Config`（schemastery）暴露：`ignorePatterns`、`burstThreshold`、`maxIndexedFiles`、`previewMaxBytes`、`backfillOnStart`、`snapshotOnTurnEnd`、`enableBetterSidebar`（是否委托可选增强）。

---

## 七、实施计划

| 阶段 | 内容 | 验收标准 |
|---|---|---|
| **P0 技术验证（½ 天）** | ① web profile 安装 + `dsh web --port 0` boot 成功；② 左栏 `sidebar.panellist` + `main` 面板跑通（`client.js` **手写自包含，不引入打包器**）；③ `sessionQuery.listSessions()` / `readTitleSnapshots()` 取会话与对话名；④ 自建 `/artifact-center/file` 路由返回真实图片与 PDF 字节，信任围栏生效；⑤ `subprocess` 把临时文件移入回收站并能从 Finder 恢复；⑥ 监听 `turn/end` 成功触发快照 diff | 每条链路在本机有"看到了"的证据；P0 全绿后才评估 desktop 安装（见 `dev-notes.zh.md` §1）。~~Office→PDF~~ 已按 D1 移除 |
| **P1 索引引擎（1–2 天）** | storageDomain 落库 + L1 回填 + L2 + **L3 快照器** + 忽略规则 + 爆量折叠 | 回填 289 份日志后能查到指定文件并显示正确对话名；快照能抓到 bash 产物 |
| **P2 面板与列表（2–3 天）** | 主面板 + 分类树 + 虚拟滚动列表 + 分类/筛选/搜索 | 从左栏进入，能按工作区/类型筛出目标文件 |
| **P3 预览与打开（1–2 天）** | 自带渲染器（图片/PDF/文本/代码/md/mermaid/html/音视频）+ 打开方式菜单 | 原生格式面板内可看；Office 等格式"用其他应用打开"生效 |
| **P4 标签/收藏/版本/失效（2 天）** | 标签 CRUD + 自动规则 + 版本聚合 + missing 校检 + 清单导出 | 打标签后能按标签筛；删源文件后条目变 missing |
| **P5 删除与恢复（½ 天）** | 回收站移动 + 二次确认 + `trashed` 标记与恢复 | 移入回收站后可从 Finder 恢复，索引同步更新 |
| **P6 Agent 工具 + i18n + 文档（1 天）** | `artifact_search` + 双语 + README 中英 | Agent 能按自然语言找到历史产物 |
| **P7 打包上架（1–2 天）** | 打包（按 `dev-notes.zh.md` §7.2：路线 A/B 无需打包器；仅路线 C 才自建 tsdown）+ 加 `dsh-plugin` topic + 目录 PR | 干净 profile 里装上即可用；市场能搜到 |

**总计约 9–13 个工作日**（比 v0.2 少 2 天，主要来自 D1 砍掉 Office 转换）。

---

## 八、发布与上架（按 D4）

### 8.1 路径

```
1. npm 发布（可选但强烈建议）+ GitHub Release 挂 tarball（可选）
2. 仓库加 dsh-plugin topic  ← 官方唯一指引，也是 D4 指定的入口
   https://github.com/topics/dsh-plugin
3. 向 awesome-dsh-plugin 提 PR，加 data/plugins/YQing0123__dsh-artifact-center.yml
4. README 给出安装命令（兜底，白名单审核期间也能装）
```

```yaml
# data/plugins/YQing0123__dsh-artifact-center.yml
url: https://github.com/YQing0123/dsh-artifact-center
name: YQing0123/dsh-artifact-center
category: ui          # 以浏览/预览 UI 为主 → ui
description:
  en: 'Artifact center: browse, preview and open every artifact a session produced.'
  zh: '产物中心：集中浏览、预览并打开会话产生的全部产物。'
```

### 8.2 收录门槛（务必逐条满足）

- `package.json` **必须声明 `dsh.bundle`**；只声明 `dsh.client` 会被 CI 拒（**最常见的拒稿原因**）；
- 仓库有真实可用代码；**仓库创建满 1 天**；加 `dsh-plugin` topic；
- 描述必须与代码逐条相符（会核对数字与 API 名）；一个 PR **最多 3 条**；
- npm 包非必需（目录里约 57% 无 npm 包，走 `github:owner/repo`），但 npm 是加分项。

### 8.3 包结构

```
dsh-artifact-center/
├── package.json            # dsh.bundle 必填；带 UI 再加 dsh.client
├── cordis.patch.yml        # 加载器补丁：插入插件行
├── index.js                # Host 半边（Node ESM，纯 JS，无需构建）
├── client.js               # 浏览器半边（自包含单文件，无需构建）
├── vendor/                 # 可选（路线 B）：mermaid / markdown-it / DOMPurify 的 UMD dist
├── locale/{en,zh}.json     # 插件卡片标题与描述
├── README.md / README.zh-CN.md / LICENSE / THIRD_PARTY_NOTICES.md
└── docs/
```

> **为什么没有 `src/`、`tsconfig.json`、`tsdown.config.ts`、`lib/`**：P0 采用官方模板同款的**纯 JS、零构建**形态（`dev-notes.zh.md` §7.2 路线 A）。这样完全不碰打包器，`node --check` 即可验证。等 P7 需要 mermaid/markdown 这类大依赖时，优先用**路线 B（自带 chunk 路由）**；只有两条路都撑不住才引入 TypeScript + 自建打包（路线 C），届时把 `exports` 改指向 `lib/`。

```jsonc
{
  "name": "dsh-artifact-center",         // 已查：npm 未被占用
  "version": "0.1.0",
  "type": "module",
  "main": "index.js",
  "exports": {
    ".":               "./index.js",
    "./client":        "./client.js",
    "./locale/*.json": "./locale/*.json",
    "./package.json":  "./package.json"
  },
  "files": ["index.js", "client.js", "vendor/**", "locale/*.json",
            "cordis.patch.yml", "README.md", "README.zh-CN.md", "LICENSE",
            "THIRD_PARTY_NOTICES.md"],
  "repository": { "type": "git", "url": "git+https://github.com/YQing0123/dsh-artifact-center.git" },
  "publishConfig": { "access": "public" },
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },      // ★ 收录硬门槛
    "client": { "platform": "web",
      "inject": ["@deepseek-ai/dsh-client-locale"] }
  },
  "peerDependencies": {
    "@deepseek-ai/cordis": ">=4.0.0 <5",
    "@deepseek-ai/dsh-client-ui-sidebar": "^0.1.5-rc.1 || ^0.2.0-rc.1",
    "@deepseek-ai/dsh-client-ui-layout":  "^0.1.5-rc.1 || ^0.2.0-rc.1"
  },
  "keywords": ["dsh", "dsh-plugin", "deepseek-harness", "artifact", "deliverables", "file-index"]
}
```

**构建要点**【源码确认】：
- **P0–P6 不需要任何构建**：Host 半边与浏览器半边都是纯 JS，改了直接生效（重装或重启）。
- 浏览器半边必须是 lazy-CJS factory：`window.__ModuleLoader__.load({ id: "<包名>", factory: (require) => {…} })`，且 `id` **必须等于包名**。
- ⚠️ **`clientBundle` 打包预设没有发布到 npm**，只存在于 DSH 仓库内（`packages/client/tsdown.client.ts`）。官方 cookbook 原话："a package outside this repository reproduces that build itself" —— 这是**尽量避免路线 C** 的核心理由。
- 若将来走 `github:` 源码安装：只跑 `prepare` 脚本，且 pnpm ≥10 会先拦截构建，用户需在 profile 的 `pnpm-workspace.yaml` 写 `allowBuilds: { dsh-artifact-center: true }`。

### 8.4 版本兼容（最容易踩的坑）

**兼容判定机制**【源码确认】：
- 只检查名字为 `@deepseek-ai/dsh` 或前缀 `@deepseek-ai/dsh-` 的 peerDependencies；`@deepseek-ai/cordis`、`react` **一律忽略**；
- 判定用 `semver.satisfies(运行时版本, 范围, { includePrerelease: true })`；不兼容 → 安装被拒；`engines.dsh` **完全不强制**。

**本机两个真实宿主版本**【实测】：桌面 App 内置 dsh = **0.2.0-rc.2**；源码 checkout（`~/.local/bin/dsh web`）= **0.1.7-rc.2**。

```jsonc
// ❌ 会静默排除 0.2.0-rc.2（0.x 的 caret 锁 minor）
"@deepseek-ai/dsh-tools": "^0.1.5-rc.1"
// ✅ 两代宿主都覆盖
"@deepseek-ai/dsh-tools": "^0.1.5-rc.1 || ^0.2.0-rc.1"
```

官方 `@deepseek-ai/*` 必须放 **peerDependencies 而非 dependencies**（后者会让 pnpm 去 npm 找未发布的包而 404）。发布后用 `node ~/.dsh/tools/check-plugin-compat.mjs` 自检。

**冷静期**：pnpm 的 `minimumReleaseAge` 意味着新版本发布后**最多 24 小时内用户可能装不到**（本机实际数值未能确认）。需要即时可用就在 README 写 `dsh plugin add dsh-artifact-center@精确版本`。

---

## 九、风险与对策

| # | 风险 | 影响 | 对策 |
|---|---|---|---|
| 1 | 快照是时间窗推断，可能误归因 | 归属错误 | 来源徽章与置信度可视化 + 手动纠正/解绑 |
| 2 | **爆量轮**（实测 1 轮 13,090 文件） | 列表爆炸 | 单轮阈值折叠 + 忽略规则 + 目录分布摘要 |
| 3 | 首次回填 289 会话可能几十秒 | 首启体验 | 后台 + 分片 + 进度条 + 已索引部分先可用 |
| 4 | `listEvents` 会完整回放日志 | 索引变慢 | 增量 cursor + 只对新增会话全量 + 定期后台校检 |
| 5 | 18 MB 级单文件 HTML 等超大文件 | 浏览器卡死 | 预览大小上限 + 超限只给源码/外部打开 |
| 6 | 原生预览器不接受跨工作区/无 session 地址 | 部分文件只能自带渲染 | 两级预览策略（见 5.3）+ 自带字节路由 |
| 7 | 自绘控件工作量大、易与宿主不一致 | 观感差 / 工期 | 只用 `--dsw-alias-*` token，参照插件管理器页面；D3 是主动选择的合规代价 |
| 8 | 与 5+ 个文件浏览器插件功能重叠 | 用户困惑 | 定位差异化："**跨工作区 · 按对话归档的产物库**"；与 `dsh-better-sidebar` 协同 |
| 9 | 版本兼容判定（web 0.1.7 / desktop 0.2.0 并存） | 装不上 | 区间型 peerDeps（`^0.1.5-rc.1 \|\| ^0.2.0-rc.1`）+ compat 脚本自检 |
| 10 | `minimumReleaseAge` 24h 冷静期 | 发布当天装不到新版 | README 给精确版本安装命令 |
| 11 | 回收站 API 跨平台差异 | 删除失败 | macOS `osascript`，Linux `gio trash`，Windows PowerShell 回收站 API；失败必须有回执 |
| ~~12~~ | ~~删除不可逆~~ | — | **已按 D2 消解**（不提供硬删） |
| ~~13~~ | ~~LibreOffice kit 打包风险~~ | — | **已按 D1 消解**（不做 Office 转换） |

---

## 十、决策状态与下一步

**全部决策已锁定**（D1–D10，见第一节），方案可开工。唯一待补充的是 GitHub 仓库地址。

### 10.1 请你创建 GitHub 仓库（建议配置）

| 项 | 建议值 |
|---|---|
| 仓库名 | `dsh-artifact-center` |
| 可见性 | Public（市场收录与安装都要求公开可安装） |
| Description | `DSH plugin: index, browse, preview and open every artifact your sessions produced — across all workspaces, by conversation.` |
| **Topics** | **`dsh-plugin`**（必需，官方唯一指引的发现入口）、`deepseek-harness`、`dsh`、`artifact` |
| 初始化 | 可先只建空仓库（我会写 README / LICENSE / package.json） |
| License | MIT（建议） |

> **仓库已建**：`https://github.com/YQing0123/dsh-artifact-center`（当前为空仓库、无 topic）。`repository` 字段已回填到 §8.3；awesome-dsh-plugin 条目为 `data/plugins/YQing0123__dsh-artifact-center.yml`，待 P7 提交。

### 10.2 P0 要验证的六条链路（约半天）

1. 搭出最小插件骨架：`package.json` + `cordis.patch.yml` + `index.js` + `client.js`（**纯 JS、零构建、零打包器**）；
2. 注册 `sidebar.panellist` 入口 + `main` 主面板，跑通"左栏点图标 → 打开产物中心"；
3. Host 侧调 `ctx.sessionQuery.listSessions()` / `readTitleSnapshots()`，拿到真实会话与对话名；
4. 自建 `/artifact-center/file` 路由，返回一张真实图片与一个真实 PDF 的字节，且信任围栏生效；
5. 实测 `subprocess` 把一个临时文件移入回收站并验证可从 Finder 恢复；
6. 监听 `turn/end` 事件，确认能触发一次快照 diff。

**先在 web profile 完成 ①（`dsh web --port 0 --no-open` 能 boot，且 warning 列表里没有 `artifact-center`）**，六条全绿后再评估 desktop 安装。

**6 条都跑通 = 方案的地基全部验证完毕**，之后按 P1–P7 推进。

---

## 附：本方案的事实来源

- **源码**：`/Users/yqing/Documents/Project/deepseek-harness-desktop/deepseek-harness`（`packages/*`、`packages/preset/agent-preset/skills/cordis-plugin-development/`）
- **运行数据**：`/Users/yqing/.dsh/{storages/workspace.json, sessions/**, storages/session_projcache/**}`
- **活体服务勘察**：`cordis_inspect_list` / `cordis_inspect_query`（Host Service / Client Slots）
- **实测统计**：26,334 个工作区文件的全量遍历与耗时；289 份会话日志的工具调用统计；12 个大会话 / 142 个 turn 的快照 diff 验证
- **生态**：npm registry（`keywords:dsh-plugin` 共 8,279 条）+ dshmarket 源码 + awesome-dsh-plugin 贡献指南
