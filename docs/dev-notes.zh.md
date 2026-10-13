# DSH 插件开发注意事项（实现前必读）

> **读者**：接下来接手编码的模型或开发者。假设你**没有**本项目的会话上下文。
> **来源**：对 DSH 源码 checkout（`/Users/yqing/Documents/Project/deepseek-harness-desktop/deepseek-harness`，版本 0.1.7-rc.2）、运行中 Host 的活体勘察（`cordis_inspect_query`）、以及本机真实运行数据的实测。
> **可信度标记**：**【源码确认】** 有源码路径支撑｜**【实测】** 在本机跑出来的事实｜**【待验证】** 尚未实测，编码时优先验证。

---

## 1. 启动安全红线（最重要，先读这一节）

### 1.1 事实（**源码 + 实测双重确认**）

DSH 启动时所有 bundle 在**同一棵 cordis 树**里激活。但失败是否致命，**取决于失败的是哪个 entry**：

```js
// packages/boot/app-boot/src/index.ts:746
const requiredStartupEntryIds = new Set([
  'agent-loop', 'webserver', 'modules', 'connection',
  'headless-runner', 'acp', 'sdk-jsonrpc-server',
])
// :925-938  auditStartupEntries()
//   required（= bootstrap Include 或上面 7 个 id 之一）里任何一个 inactive
//     → throw StartupError → 启动失败，进程退出
//   其余 entry inactive
//     → 只是 warn("dsh: warning: N entries did not activate")，**启动继续**
```

**【实测】** 在本机 web profile 上跑 `dsh web --port 0 --no-open`：`dsh-mnemon` 等 **5 个 entry 激活失败**（`ctx.settings.register is not a function`），输出 `dsh: warning: 5 entries did not activate`，而服务**照常启动**并打印了 `dsh web: http://127.0.0.1:60731/?token=…`。

**结论**：本插件的 entry id 是 `artifact-center`，**不在那 7 个必需 id 里** → 它自己失败**不会**让 DSH 起不来，只会多一行 warning。插件市场页面同样不在必需列表里，所以照样能进去卸载。

> ⚠️ **仍然不要把这条当作"可以随便写"的许可**：真正致命的路径是**间接的**——如果插件在 `apply` 期间做了会波及必需 entry 的事（例如注册一个**重复的** `webServer` 路由使宿主注册链异常、或阻塞事件循环导致 `webserver` 超时未激活），就会升级成启动失败。安全写法照 §1.3 执行，成本很低。

### 1.2 对本项目的具体风险

本项目跑在用户**正在使用的 DSH 客户端里**。当前会话的 `DSH_PROFILE=desktop`，即 **Electron 桌面应用**。desktop profile **由 Electron 独占管理**，CLI 命令 `dsh plugin --profile desktop ...` 会被拒绝：

```
profile "desktop" is managed exclusively by the Electron application
```

如果（在极端情况下）桌面应用真的起不来，唯一的恢复办法是手改 `~/.dsh/profiles/desktop/package.json`，把包名从 **`dependencies`** 和 **`dsh.profile.bundles`** 两处同时删掉。**【源码确认】**

### 1.3 硬性编码要求（成本极低，照做即可）

1. **模块顶层零副作用**：不 `throw`、不 `await`、不读文件、不联网、不 `process.exit`。只做纯声明。
2. **只 `inject` 确定存在的服务**。本插件只硬依赖 `webServer`；其余（`sessionQuery`、`workspaceRegistry`、`fs`、`subprocess`）一律用 `ctx.get('name')` **探测后使用**。缺少某个服务时，插件应降级运行并把缺失信息暴露到状态接口。
3. **所有注册都放进 `ctx.effect()`**，靠返回的 disposer 随 fiber 释放。
4. **可疑操作包 try/catch**：服务探测、业务初始化、第一次扫描——失败就降级成"状态接口里的 `error` 字段"，绝不向上抛。
5. **不要注册重复的 `webServer` 路由**：`register()` 对同一 `(kind, path)` 会 **throw**（契约如此），这会让你自己的 entry 失败——虽然只是 warning，但功能全丢。
6. **提交前逐个 `node --check <file>`** 做语法检查。
7. **先在 web profile 隔离验证**（见下），确认能 boot 再进 desktop。

### 1.4 安全的验证顺序（命令已实测）

```bash
# 1) 先在 web profile 试装（独立进程，不影响用户桌面应用）
cd /Users/yqing/Documents/Project/dsh-plugin
dsh plugin --profile web add .            # 也支持 add link:$PWD

# 2) 启动一个临时实例，看是否 boot 成功（端口 0 = 随机端口，不抢 3080）
#    ⚠️ 注意：`dsh web` 本身就等于 `--profile web`，再加 --profile 会报
#       "select a profile only once"（实测）。别写成 dsh web --profile web。
dsh web --port 0 --no-open
#     看到 dsh web: http://127.0.0.1:<port>/?token=... 即成功；Ctrl-C 收回
#     同时留意 stderr 里的 "warning: N entries did not activate" —— 里面应**没有** artifact-center

# 3) 确认插件行已挂上（dump-config 需要显式 --profile，因为子命令不是 profile 名）
dsh --profile web --dump-config | grep -A3 artifact-center

# 4) 出问题就摘掉
dsh plugin --profile web remove dsh-artifact-center
```

> **本机 web profile 现状**【实测】：它现在有 **5 个 entry 起不来**（`dsh-mnemon` 在 0.1.7-rc.2 上报 `ctx.settings.register is not a function`，另有 modsearch 同样症状）。这是**既有环境问题，与本插件无关**，但验证时要在 warning 列表里区分清楚。
```

> desktop profile **不要**用 CLI 试装。它的安装路径是 GUI 插件市场，或 agent 侧 `plugin_manager` 工具（`action: install_bundle`，`target` 传绝对目录）。

---

## 2. 环境事实（本机实测）

| 项 | 值 |
|---|---|
| 本会话 profile | **`desktop`**（`DSH_PROFILE=desktop`，`DSH_PROFILE_DIR=/Users/yqing/.dsh/profiles/desktop`） |
| 开发/试装 profile | `web`（`/Users/yqing/.dsh/profiles/web`），CLI 可控 |
| 桌面宿主版本 | **0.2.0-rc.2**（Electron 内置） |
| 源码 checkout 宿主版本 | **0.1.7-rc.2**（`~/.local/bin/dsh web` 从这里启动） |
| 工作区 | `/Users/yqing/Documents/Project/dsh-plugin`（= 本仓库根目录） |
| npm 源 | `registry.npmmirror.com` |
| 冷却期 | pnpm `minimumReleaseAge`，实测约 24h |
| 兼容自检 | `node ~/.dsh/tools/check-plugin-compat.mjs` |

**两代宿主并存是真实的**，peer 范围必须同时覆盖 0.1.x 与 0.2.x。

**CLI 子命令与 profile 的关系**【源码 + 实测】：

| 写法 | 含义 | 说明 |
|---|---|---|
| `dsh web [flags]` | = `dsh --profile web [flags]` | **`web` 这个子命令本身就是 profile 名** |
| `dsh --profile web --dump-config` | 打印合成后的插件树 | 这里必须显式 `--profile`，因为子命令是 `--dump-config` 而不是 profile |
| `dsh plugin --profile web add <pkg>` | 往 profile 装插件 | `plugin` 是子命令，profile 用 flag |
| ❌ `dsh web --profile web` | **报错** `select a profile only once` | 实测踩过 |

**web profile 当前状态**【实测】：`dsh web --port 0 --no-open` **能成功启动**（打印 `http://127.0.0.1:<port>/?token=…`），但伴随 `dsh: warning: 5 entries did not activate` —— `dsh-mnemon` 在 0.1.7-rc.2 上报 `ctx.settings.register is not a function`，modsearch 同症状。这是**既有环境问题**，与插件无关，但验证时要能在 warning 列表里把它和 `artifact-center` 区分开。

---

## 3. 插件包结构与 manifest

### 3.1 目录

```
dsh-artifact-center/
├── package.json              # ★ 必须声明 dsh.bundle
├── cordis.patch.yml          # 加载器补丁：插入插件行
├── index.js                  # Host 半边入口（Node ESM，纯 JS，无需构建）
├── client.js                 # 浏览器半边（必须单文件、自包含）
├── vendor/                   # 可选（§7.2 路线 B）：mermaid / markdown-it / DOMPurify 的 UMD dist
├── locale/{en,zh}.json       # 插件卡片标题与描述
├── README.md / README.zh-CN.md / LICENSE / THIRD_PARTY_NOTICES.md
└── docs/
```

> **没有 `src/` / `tsconfig.json` / `lib/` 是有意的**：第一版采用官方模板同款的**纯 JS、零构建**形态，`node --check` 即可验证，完全不碰打包器（理由见 §7）。只有确认必须走 §7.2 路线 C 时才引入 TypeScript 与 `lib/` 输出。

### 3.2 `package.json`（可直接照抄后按需调整）

```jsonc
{
  "name": "dsh-artifact-center",
  "version": "0.1.0",
  "description": "产物中心 · Artifact Center — index, browse, preview and open every artifact your DSH sessions produced, across all workspaces, by conversation.",
  "type": "module",
  "main": "index.js",
  "exports": {
    ".":               "./index.js",
    "./client":        "./client.js",
    "./locale/*.json": "./locale/*.json",
    "./package.json":  "./package.json"
  },
  "files": [
    "index.js", "client.js", "vendor/**", "locale/*.json",
    "cordis.patch.yml", "README.md", "README.zh-CN.md", "LICENSE",
    "THIRD_PARTY_NOTICES.md"
  ],
  "repository": {
    "type": "git",
    "url": "git+https://github.com/YQing0123/dsh-artifact-center.git"
  },
  "publishConfig": { "access": "public" },
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },   // ★ 上架硬门槛
    "client": {
      "platform": "web",
      "inject": ["@deepseek-ai/dsh-client-locale"]
    }
  },
  "peerDependencies": {
    "@deepseek-ai/cordis": ">=4.0.0 <5",
    "@deepseek-ai/dsh-client-ui-sidebar": "^0.1.5-rc.1 || ^0.2.0-rc.1",
    "@deepseek-ai/dsh-client-ui-layout":  "^0.1.5-rc.1 || ^0.2.0-rc.1"
  },
  "keywords": ["dsh", "dsh-plugin", "deepseek-harness", "artifact", "deliverables", "file-index"]
}
```

**关键约束**【源码确认】：

- `dsh.bundle.patch` 是**收录硬门槛**。只声明 `dsh.client` 会被上架 CI 拒（最常见的拒稿原因）。
- `dsh.client.platform` 必须是 `"web"`；`inject` / `external` 必须是字符串数组，`immediately` 必须是 boolean，否则客户端扫描时**直接抛错并让 fiber 失败**（`packages/client/modules/src/client/manifest.ts:167-179`）。
- `exports["./client"]` 必须存在，指向浏览器半边产物（`docs/subsystems/client-modules.md:80`）。
- 官方 `@deepseek-ai/*` 必须放 **peerDependencies 而非 dependencies**（放 dependencies 会让 pnpm 去 npm 找不发布的包而 404）。
- `package.json.icon`（可选）：SVG/PNG/JPEG/WebP，**≤256 KiB**，realpath 后必须在 manifest 目录内。

### 3.3 `cordis.patch.yml`

```yaml
- insert:
    - id: artifact-center
      name: dsh-artifact-center
```

`id` 是本插件的加载器条目 id，也是日志与 `--dump-config` 里看到的名字。

---

## 4. Host 半边编写规范

### 4.1 导出形式

```js
// index.js
export const name = 'artifact-center'
export const inject = ['webServer']          // 只写确定存在的硬依赖
export function apply(ctx, config) {
  // 所有注册都在这里
}
```

也支持 `ctx.plugin(SomeService)` 形式；本插件以 `apply` 为主。

### 4.2 服务探测（防御式）

```js
const sessionQuery = ctx.get('sessionQuery')   // 可能 undefined
const wsRegistry   = ctx.get('workspaceRegistry')
```

**不要**把 `sessionQuery` 写进 `inject`，除非你确定所有目标 profile 都有它——`inject` 缺服务会让插件整体不激活；而探测式写法能让插件在缺服务时**降级运行并如实报告**。

### 4.3 注册必须走 effect

```js
ctx.effect(() => ctx.webServer.register({
  kind: 'prefix',
  path: '/artifact-center/api',
  handler: routeHandler,
}), 'artifact-center: api routes')
```

`ctx.effect(fn, label)` 会调用 `fn`，把返回的函数当作 disposer 随 fiber 释放。**【源码确认 + 生态实例】**（`dsh-better-sidebar` 的 `lib/index.js:4936` 就是这个写法）

### 4.4 插件配置

用 schemastery（`@deepseek-ai/schemastery`）声明 `Config`，用户可在 `cordis.patch.yml` 里覆盖——**用户补丁层在升级后依然存活**。

### 4.5 事件监听

- 统一入口是 **`session/event`**（`(session, event)`，每次 append 都触发）。**【源码确认】** `packages/core/session/src/index.ts:77`
- 需要的会话事件类型：`tool/call`（`{turn, step, callId, name, arguments: string}`，**arguments 是 JSON 字符串，要 JSON.parse**）、`turn/end`、`deliverables/presented`、`session/title`。
- **waterfall 事件必须返回 `next()`**（如 `tools/pre-execute`），漏掉会断链。
- **不要向会话日志 append 自定义事件类型**：读取方只接受带 `ignorable: true` 的未知事件，而 `Session.append()` 无法设置该标记 → **会话会拒绝重新打开**。插件自有数据放自己的 storage service。**【源码确认，practices.md】**

### 4.6 持久化

用 `ctx.storageDomain.open(spec)`，不要裸写 JSON 文件：

```js
const spec = {
  name: 'artifact-center',        // → ~/.dsh/storages/artifact-center（per-record 时是目录）
  version: 1,
  layout: 'per-record',
  invalidRecords: 'backup-and-skip',   // 索引是派生数据，坏记录不该阻塞整库
  tables: { artifacts: {...}, tags: {...}, snapshots: {...} },
}
await ctx.storageDomain.open(spec)
```

参照实现：`packages/workspace/workspace/src/spec.ts`（领域声明）+ `packages/workspace/workspace/src/index.ts:198`（打开）。

> **原则**：官方实践明确"**会话日志是唯一真源，插件记忆是派生缓存**"。因此索引必须**可从日志重建**。

### 4.7 日志

用 `ctx.logger?.info(...)` / `?.warn(...)`，方便在 `dsh web` 输出里定位。

---

## 5. Client 半边编写规范

### 5.1 产物格式（硬要求）

浏览器半边**必须**是下面这个形状，且 `id` **必须等于 npm 包名**：

```js
window.__ModuleLoader__.load({
  id: 'dsh-artifact-center',
  factory(require) {
    const React = require('react')
    // ...
    return { inject: ['slots', 'layout'], apply(ctx) { /* ... */ } }
  },
})
```

**【源码确认】** 模板：`packages/preset/agent-preset/skills/cordis-plugin-development/templates/decoration/client.js`

加载：宿主把每个声明了 `dsh.client` 的包合成 `window.__DSH_BOOT__`，路由前缀 `/plugins`，行 URL 形如 `/plugins/<id>/client.js?rev=<hash>`（`packages/client/modules/src/index.ts:224,230-243`）。

### 5.2 可以 require 什么

共享模块表（`packages/client/web/src/platform.ts:8-14`）**只有 9 项**：

`react`、`react/jsx-runtime`、`react-dom`、`react-dom/client`、`@deepseek-ai/cordis`、`dsh-client-store`、`dsh-client-ui-slots`、`dsh-client-ui-primitives`、`dsh-client-ui-dockkit`

**本项目已决定遵守官方禁令：不 require 任何 `@deepseek-ai/dsh-client-ui-*`**（含 `ui-primitives`）。原因：它们是 Harness Client 包，**无预警变更**；一个抛错的组件会直接让整个 slot 条目崩掉（控制台 `slot entry crashed in '<slot>'`）。

→ 控件（Button / Modal / Tag / Tooltip / Menu / Toast / Switch）**按官方 primitive 的 markup + 行为自绘**，只引用主题 token；复制时保留用户依赖的行为（Modal 焦点与 Escape、`role="switch"` + `aria-checked`、Tooltip 定位）。

参考可读物：`packages/client/ui-primitives/src/index.ts`（导出清单，用于照抄行为，不是用于 import）。

### 5.3 样式

- 只用主题 token（`--dsw-alias-*`），**禁止字面色值**（除插画类）。
- CSS Modules + clsx；CSS 由打包器内联进 bundle。
- 常用 token：`--dsw-alias-bg-layer-1/2/3`、`--dsw-alias-label-primary`、`--dsw-alias-border-l1…l4`、`--dsw-alias-interactive-bg-hover`、`--dsw-alias-brand-primary`、`--dsw-alias-code-diff-added/deleted`。
- 需要**同一份样式同时适配浅色/深色**（token 自动切换，别写死颜色）。

### 5.4 左侧栏入口 + 主面板（本插件核心挂载点）

机制：`sidebar.panellist` 的 list `id` **就是** `main` keyed slot 的 `key`；点击图标时宿主调 `ctx.layout.selectPanel(id)`。

```js
const PANEL_ID = 'artifact-center'

// 主面板（root scope，无 session 也能用）
ctx.slots.inject('main', () => ctx.slots.register(
  { name: 'main', key: PANEL_ID },
  ArtifactCenterPage,
))

// 左侧栏图标
ctx.slots.inject('sidebar.panellist', () => ctx.slots.register(
  { name: 'sidebar.panellist', id: PANEL_ID, order: 60, label: () => t('panel') },
  ArtifactsIcon,
))

// 供其它插件/对话跳转进来
ctx.reflect.provide('artifactNavigation', {
  open: (filter) => ctx.layout.selectPanel(PANEL_ID),
})
```

**必须遵守的约束**：

- `main` 的 `key` 与 `sidebar.panellist` 的 `id` **必须完全一致**；`main` 里**未注册的 key 会直接 throw**（`packages/client/ui-layout/src/client/service.ts:72-77`）。
- `main` 是 `scope: 'root'` —— 这是**唯一**能在"没有活动会话"时也渲染的宿主位置。右栏（`sidebar.right.*`）全是 `scope: 'session'`，无 session 时 `openResource` 会抛 `sidebarRight: no session surface is mounted`。
- **不要在 `apply` 阶段直接 `selectPanel`**（源码里该调用都发生在用户手势或服务回调中；时序未验证）。
- 参考实现：`packages/client/ui-schedule/src/client/index.ts`（最干净的 panellist + main 范例）、`packages/client/ui-plugin-manager/src/client/index.ts`（管理列表样式基准）。
- 框架**没有**共享的虚拟列表 / 树组件（只有 `JsonTree` 与 `ui-dockkit` 的 `PaneTree`）→ 大数据量列表的虚拟化要自己实现。

### 5.5 从 Client 调 Host

两条路：

1. **Remote 服务**（有 session 上下文时）：如 `ctx.remote.session.workspacePathApplications({path})`、`openWorkspacePath({path, action, application})`。
2. **自建 web 路由**（全局面板必须走这条）：`fetch('/artifact-center/api/...')`。

见下一节。

---

## 6. 关键 API 速查

### 6.1 会话与工作区

| 用途 | 调用 | 备注 |
|---|---|---|
| 列全部会话 | `ctx.sessionQuery.listSessions()` → `SessionRecord[]` (`{header, live, persisted}`) | 最轻量，"newest first" |
| 列某会话的全部事件 | `ctx.sessionQuery.listEvents(sessionId)` | **会完整回放日志**，大历史慢；回填要后台+分片 |
| 取对话名 | `ctx.sessionQuery.readTitle(sessionId)` / `readTitleSnapshots([ids])` | **`SessionHeader` 没有 title 字段**，标题是 `session/title` 事件 |
| 列工作区 | `ctx.workspaceRegistry.list()` → `{id, path, title, sessionIds}` | 顺序即权威展示顺序 |
| 会话归属工作区 | 同时满足：id 在 `sessionIds` 里 + 该会话 `header.cwd` 的 realpath == 工作区 `path` | 不要只看 id |

**【重要】不要自己解压/解析会话日志**。日志是 zstd 压缩的 JSONL（`session.v4.jsonl.zstd`），格式会随版本演进；`ctx.sessionQuery` 是唯一统一读入口。

### 6.2 文件字节（**本项目必须自建路由**）

`ctx.workspaceFiles.read/readBytes/stat/changes` **每个方法都要 `WorkspaceFileScope = {sessionId, workspaceRoot}`**。全局面板没有 session → **用不了**。`dsh-resource://file/absolute/…` 也"carries no Session and cannot authorize a Host call"。

→ **必须**自己注册 `webServer` 路由提供字节流。生态范例：`dsh-better-sidebar` 的 `/sidebar/file` 媒体路由（含 content-type、大小上限、Range）。

```js
ctx.webServer.register({
  kind: 'prefix',                 // 'exact' 精确匹配；'prefix' 匹配 p 与 p/<anything>
  path: '/artifact-center/file',
  handler: async (req, res) => { /* 自己写状态码、头、body，全程拥有 response */ },
})
```

`WebRoute` 形状**【源码确认】**：`packages/host/webserver/src/index.ts:42-48`
重复注册同一 `(kind, path)` 会 **throw**（`register()` 的契约）。

**请求授权（务必实现）**：DSH 没有导出通用守卫，生态做法是自写一个"浏览器信任围栏"：

```js
function isTrustedApiRequest(request, trustedHosts = []) {
  const host = request.headers.host
  if (typeof host !== 'string') return false
  const hostUrl = new URL(`http://${host}`)                 // 解析失败需 try/catch
  const loopback = hostUrl.hostname === 'localhost'
    || hostUrl.hostname === '[::1]'
    || /^127\.(\d{1,3}\.){2}\d{1,3}$/.test(hostUrl.hostname)
  if (!loopback && !trustedHosts.includes(hostUrl.hostname)) return false
  if (request.headers['sec-fetch-site'] === 'cross-site') return false
  const origin = request.headers.origin
  if (origin === undefined) return true
  try { return new URL(origin).hostname === hostUrl.hostname } catch { return false }
}
```

即：**Host 头必须是回环或受信主机 + 不是跨站 + Origin 同源**。参照 `dsh-better-sidebar/lib/index.js` 的 `trust-fence.ts` 区段。

### 6.3 打开方式

| 用途 | 调用 |
|---|---|
| 列可用应用 | `ctx.sessionController.workspacePathApplications({ path })` → `{id, name, default, icon}[]` |
| 用默认程序打开 | `ctx.sessionController.openWorkspacePath({ path })` |
| 用指定应用打开 | `openWorkspacePath({ path, application: id })` |
| 在文件管理器里定位 | `openWorkspacePath({ path, action: 'reveal' })` |

经 `remote.session` 调用时有 session 前提；全局面板需自建 Host 路由 + `@deepseek-ai/dsh-native-command`（`openNativeAssociatedPath` / `revealNativePath` / `openNativeFileApplication` / `nativeFileApplications`）。

注意：`packages/host/open-in-app` 的 `/open-in-app/open` HTTP 路由**只接受绝对目录路径**，**不能用来打开单个文件**。

### 6.4 删除（**DSH 没有删除 API**）

`ctx.fs` 的抽象方法穷举（`packages/fs/fs/src/index.ts:132-287`）：
`resolve / processPath / processPathFromHostPath / fileUrl / contains / stat / lstat / readText / streamText / readBytes / readByteRange / listDir / writeText / editText / watch`
—— **没有 remove / unlink / rm / delete**。仓库里唯一的 `rm` 是 fs-local 原子写的内部实现，非公开 API。

→ 本项目按决策 **一律"移入回收站"**，用 `ctx.subprocess.spawn()`：

```js
ctx.subprocess.spawn({
  argv: ['osascript', '-e', `tell application "Finder" to delete POSIX file "${abs}"`],  // macOS
  cwd: workspaceRoot,
  stdio: { stdin: 'ignore', stdout: 'ignore', stderr: 'capture' },
  graceMs: 5000,
})
```

`SubprocessSpawnSpec`：`{argv, cwd, stdio, graceMs, signal?, env?}`（`packages/subprocess/subprocess/src/types.ts:77-107`）。`argv[0]` 是程序，**不经 shell**。

**安全要求**：删除前展示完整路径/大小/所属对话/多版本引用；二次确认；删除后只把索引标 `trashed`，记录保留；失败必须有回执，**不能静默失败**。

#### 6.4.1 已实测的回收站行为（**重要，直接影响验收方式**）

在本机跑过一次完整探针（建临时文件 → `osascript` 移入回收站）：

| 观察 | 结果 |
|---|---|
| `osascript` 退出码 | **0** |
| 它的 stdout | `document file xxx.txt of item .Trash of folder yqing of folder Users of startup disk`（即 Finder 返回了回收站里的对象引用） |
| 源文件 | **已消失** ✅ |
| `~/.Trash` 目录 mtime | 更新到操作时刻 ✅ |
| **从 Host 进程列举 `~/.Trash`** | **`PermissionError: Operation not permitted`** ❌ |

结论：

1. **`osascript` 移入回收站在本机可用**，不需要任何额外授权弹窗（P0 第 ⑤ 条已验证通过）。
2. ⚠️ **不要试图在 Host 进程里校验回收站内容**：macOS TCC 保护 `~/.Trash`，`fs.readdir` / `ls` 一律被拒（`ls` 甚至只返回 `total 0`，**看起来像成功了，实际是被静默过滤**——很容易写出假阳性校验）。
3. 因此删除的**成功判据只能是**：`osascript` 退出码为 0 **且** 源路径已不存在。**不要**依赖读取回收站。
4. "恢复"功能不要在插件里做——只能提示用户「可从系统回收站取回；取回后重新校检即可恢复索引状态」（这也是方案里的既定做法）。

> 注：插件代码在 Host 进程内以用户权限运行，**不经过 DSH 的审批体系**。所以"删除"必须由插件自己把关。

### 6.5 与本项目无关但容易误用的能力

`ctx.officeToPdf.convert(request)` 可以做 Office→PDF（本机已装 LibreOffice.app，服务在运行中的 Host 里已挂载）。**本项目按决策 D1 不使用**——不做任何格式转换，Office 文件一律交给"打开方式"。

---

## 7. 构建与打包

### 7.1 现状

- Host 半边：`tsc` 输出到 `lib/`。
- 浏览器半边：**`clientBundle` 打包预设没有发布到 npm**，只存在于 DSH 仓库内（`packages/client/tsdown.client.ts`）。官方 cookbook 原话：*"a package outside this repository reproduces that build itself"* → **外部包必须自建等价配置**。
- 源码安装（`github:`）只跑 `prepare` 脚本，且 pnpm ≥10 会先拒绝构建，用户需在 profile 的 `pnpm-workspace.yaml` 写 `allowBuilds: { dsh-artifact-center: true }`。

### 7.2 推荐路线（按风险从低到高）

**路线 A（强烈推荐先走这条）：不用打包器，手写自包含 `client.js`**

第一版把 UI 写成单文件纯 JS（`client.js`），只 `require('react')`，**零第三方依赖**。配合 `node --check` 即可，完全不碰打包器，也不碰 vendor 依赖。

**路线 B：自带 chunk 路由（生态已验证，推荐用于 markdown / mermaid）**

需要 markdown 渲染与 mermaid（它们体积大）时，**不要**急着上打包器：

1. 把 vendor 的 UMD dist（`markdown-it.min.js`、`mermaid.min.js`、`purify.min.js`）放进 `vendor/`；
2. 用自建 Host 路由按白名单文件名提供这些文件（`/artifact-center/bundle/<name>.js`），带 `cache-control: no-cache` + ETag + `If-None-Match`；
3. 客户端首次用到某能力时，动态注入 `<script>` 加载它（UMD 会挂到 `window`）。

这正是 `dsh-better-sidebar` 的做法（`/sidebar/bundle/<name>.js`，白名单 `["terminal","editor","mermaid","locale"]`，见其 `lib/index.js` 的 `bundle-route.ts` 区段）。**好处**：完全绕开打包器配置，HMR 友好，chunk 可懒加载。**代价**：要自己做白名单与缓存头，并遵守各依赖的许可证（在 `THIRD_PARTY_NOTICES.md` 里署名）。

**路线 C（最后再考虑）：自建 tsdown/rolldown 配置**

只有当路线 A/B 撑不住时再做。产物**必须**是 §5.1 那个形状的单文件。

---

## 8. 发布流程

### 8.1 事实纠正

- **DSH 官方仓库没有插件库，也不接受外部 PR**（`CONTRIBUTING.md`：*"we cannot accept external pull requests at the moment"*）。
- 官方给插件作者的**唯一**指引：给 GitHub 仓库加 **`dsh-plugin` topic**。
- 用户口中的"官方插件库"实际是 **dshmarket 的目录源**；dshmarket **有安装网闸**，非白名单源一律 400 `plugin is not in the curated registry`。
- 目录 = **awesome-dsh-plugin**（人工策展白名单），收录方式是**提 PR 加一个文件**。

### 8.2 步骤

```
① npm publish（可选但强烈建议）+ 打 dsh-plugin topic
② 向 awesome-dsh-plugin 提 PR：新增 data/plugins/YQing0123__dsh-artifact-center.yml
```

```yaml
# data/plugins/YQing0123__dsh-artifact-center.yml
url: https://github.com/YQing0123/dsh-artifact-center
name: YQing0123/dsh-artifact-center
category: ui          # 合法值：agi ui usage theme model identity session memory tools wsl browser vision voice docs skill workflow git notify dev security remote market fun
description:
  en: 'Artifact center: browse, preview and open every artifact a session produced.'
  zh: '产物中心：集中浏览、预览并打开会话产生的全部产物。'
```

**收录门槛**：`package.json` 必须声明 `dsh.bundle`；仓库创建满 1 天；加了 `dsh-plugin` topic；描述与代码逐条相符；**一个 PR 最多 3 条**。

### 8.3 版本兼容

判定规则**【源码确认】**：只检查名字为 `@deepseek-ai/dsh` 或前缀 `@deepseek-ai/dsh-` 的 peerDependencies，用 `semver.satisfies(宿主版本, range, { includePrerelease: true })`；不兼容则**安装被拒**；`engines.dsh` **完全不强制**。

```jsonc
// ❌ 静默排除 0.2.0-rc.2（0.x 的 caret 锁 minor）
"@deepseek-ai/dsh-client-ui-sidebar": "^0.1.5-rc.1"
// ✅ 覆盖两代宿主
"@deepseek-ai/dsh-client-ui-sidebar": "^0.1.5-rc.1 || ^0.2.0-rc.1"
```

发布后跑 `node ~/.dsh/tools/check-plugin-compat.mjs` 自检。

### 8.4 冷静期

`minimumReleaseAge` 约 24h：**发布当天用户可能装不到新版**。README 里给 `dsh plugin add dsh-artifact-center@<精确版本>` 作为兜底。

---

## 9. 已知陷阱清单

| # | 现象 | 根因 | 对策 |
|---|---|---|---|
| T1 | 装完 `dsh web` 起不来 | **只有** 7 个必需 entry（`agent-loop`/`webserver`/`modules`/`connection`/`headless-runner`/`acp`/`sdk-jsonrpc-server`）或 bootstrap Include 失败才致命；普通插件失败**只是 warning**（`app-boot/src/index.ts:746,925-938`） | 本插件 id 不在必需列表 → 自身失败不致启动失败；但仍照 §1.3 写，避免波及必需 entry |
| T1b | 插件静默不生效，只在 stderr 留一行 `N entries did not activate` | 同上：非必需 entry 失败被降级为 warning，容易被忽略 | 每次 `dsh web --port 0` 后都要**读 stderr 的 warning 列表**，确认里面没有 `artifact-center` |
| T2 | 点侧栏图标报 `main panel "x" is not registered` | `main` 的 key 与 `sidebar.panellist` 的 id 不一致 | 用同一个常量；成对注册 |
| T3 | 升级 DSH 后插件 UI 白屏 | `require('@deepseek-ai/dsh-client-ui-primitives')` 等 Harness Client 包变更 | **本项目禁止 import 任何 `dsh-client-ui-*`**，控件自绘 |
| T4 | 全局面板读不到文件字节 | `workspaceFiles.*` 每个方法都要 `sessionId`；`dsh-resource://file/absolute/...` 无法授权 | 自建 `webServer` 字节路由 |
| T5 | 想删文件但找不到 API | `ctx.fs` 契约里没有删除 | `ctx.subprocess.spawn()`；本项目一律移入回收站 |
| T5b | 回收站校验永远失败，或假成功 | macOS TCC 保护 `~/.Trash`，Host 进程读不了（`ls` 只回 `total 0`，**像成功实为被过滤**） | 只用「退出码 0 + 源路径消失」判定；不读回收站、不做插件内恢复 |
| T6 | 自己解 zstd 日志，格式一变就崩 | 日志是 `session.v4.jsonl.zstd`，格式随版本演进 | 一律走 `ctx.sessionQuery` |
| T7 | 拿不到对话标题 | `SessionHeader` 没有 title 字段，标题是 `session/title` 事件 | `sessionQuery.readTitle*()` |
| T8 | web 上装得上、desktop 装不上（或反之） | 两代宿主并存（0.1.7-rc.2 / 0.2.0-rc.2），peer 范围没覆盖 | `^0.1.5-rc.1 \|\| ^0.2.0-rc.1` |
| T9 | 上架被 CI 拒 | 只声明了 `dsh.client`，没声明 `dsh.bundle` | 必须有 `dsh.bundle.patch` |
| T10 | 改了代码但界面没变 | **替换已安装包必须重启**（HMR 只在 bundle 文件变化时重建，且需 dev 模式在跑） | 改完重启 Host + 刷新页面 |
| T11 | 会话突然打不开 | 向日志 append 了自定义事件类型 | 绝不新增事件类型；插件数据放自己的 storage |
| T12 | 工具调用链断了 | waterfall 监听器没有返回 `next()` | 所有 waterfall 回调必须 `return next()` |
| T13 | 主题/语言不跟随 | 用 iframe 嵌了 Host 页面 | 用 slot 渲染 React 组件，不要 iframe（PDF/HTML 预览除外） |
| T14 | present 的路径 stat 失败 | `deliverables/presented` 存的是模型给的**原始路径（可能相对）** | 用该 session header 的 `cwd` 解析后再 stat；失败标 `missing` 不删记录 |
| T15 | 历史轮次的变更文件列表是空的 | `ctx.workspaceChanges` **只在 Host 内存**，Session dispose/重启即消失 | 自己持久化快照；它只作 live 补充 |
| T16 | 自建打包配置写不出来 | `clientBundle` 预设未发布到 npm | 走 §7.2 路线 A 或 B，尽量不写打包器 |
| T17 | 打开一个 18 MB 的 HTML 把浏览器卡死 | 本机真实存在 18 MB 级单文件 HTML | 预览设大小上限，超限只给源码/外部打开 |
| T18 | `dsh plugin add` 装完没有构建产物 | 源码安装（`github:`）只跑 `prepare`，且 pnpm ≥10 默认拦截构建脚本 | 提供 `prepare`；README 写明 `allowBuilds` |
| T19 | 刚发布的版本用户装不到 | pnpm `minimumReleaseAge` 约 24h | README 给精确版本安装命令 |
| T20 | 想复用 better-sidebar 的渲染器却 import 不到 | 它不在 `PLATFORM_MODULES`，组件未导出，跨特性插件值导入被禁 | 只能通过它暴露的 cordis 服务 / 自有 HTTP 路由协作 |
| T21 | 会话日志回填很慢，首启像卡死 | `listEvents` 会完整回放日志 | 后台异步 + 分片 + 进度；已索引部分先可用 |
| T22 | 单轮产物列表爆炸（实测出现过 13,090 个文件） | 快照 diff 会捕获 `npm install` / 批量生成 | 单轮阈值折叠为"批量产出"卡片 |

---

## 10. 调试与验证手段

1. **`cordis_inspect_query`（最强工具，无需重启）**
   - `platform=host, provider=Service, method=listService` → 全部 Host 服务与**精确方法签名**
   - `platform=host, provider=Config, method=listConfigs` → 按包名找插件条目，拿 `packageDir` 读它的 README
   - `platform=client, provider=Slots, method=listSubTree` → 活体 slot 树、注册参数、scope、已占用的 key
   - `platform=client, provider=Theme, method=listTokens` → 当前主题 token 名
   - `platform=host, provider=Event, method=listEvents` → 事件名与静态/瀑布模式
   > **写代码前先用它确认签名**，比读源码快，而且反映的是"运行中的这一版"。
2. `node --check <file>` —— 每个 JS 文件提交前必过。
3. `dsh web --port 0 --no-open` —— 唯一能确认"插件树是否成功启动"的手段（注意：`dsh web` 已隐含 `--profile web`，不要再加 `--profile`）。
4. `dsh --profile web --dump-config` —— 看合成后的插件树。
5. 浏览器验证 —— 若有可控浏览器（如 MCP browser 工具），打开 `DSH_WEB_URL` 截图确认左栏图标与面板；否则如实说明"未做视觉验证"。
6. 读安装包的 `lib/index.js` + `README.md` —— 生态实现比文档更可信。

---

## 11. 参考路径速查（源码 checkout）

| 用途 | 路径 |
|---|---|
| 插件开发 Skill（权威） | `packages/preset/agent-preset/skills/cordis-plugin-development/` |
| 最小插件模板 | `.../templates/decoration/{package.json,cordis.patch.yml,index.js,client.js}` |
| 侧栏 + 主面板范例 | `packages/client/ui-schedule/src/client/index.ts` |
| 管理列表样式基准 | `packages/client/ui-plugin-manager/src/client/index.ts` |
| 可复用控件行为 | `packages/client/ui-primitives/src/index.ts` |
| 会话查询服务 | `packages/session-query/session-query/src/index.ts` |
| 工作区注册表 | `packages/workspace/workspace/src/index.ts` |
| 存储领域声明范例 | `packages/workspace/workspace/src/spec.ts` |
| Web 路由契约 | `packages/host/webserver/src/index.ts:42-48` |
| fs 契约（确认无删除） | `packages/fs/fs/src/index.ts:132-287` |
| 工具调用→文件路径投影 | `packages/deliverables/workspace-changes/src/capture.ts:99-112` |
| 官方 present 打开文件 | `packages/client/ui-deliverables/src/present-open.ts:87-122` |
| 生态 HTTP 路由 + 信任围栏范例 | `~/.dsh/profiles/web/node_modules/dsh-better-sidebar/lib/index.js` |
