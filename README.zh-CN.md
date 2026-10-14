# 产物中心 · dsh-artifact-center

把“上次对话生成的文件在哪”变成一次搜索。产物中心索引有对话血缘的文件，并保留工作区、所属对话、轮次与产出历史。

[English](README.md) · [需求规格](docs/requirements.zh.md) · [验收记录](docs/acceptance.zh.md)

## 使用

从 DSH 左栏打开“产物中心”，按工作区、标签或时间筛选。文件格式直接在左侧“可读取格式”的扩展名上勾选或取消，选中即展示、取消即隐藏，选择保存在当前浏览器。搜索框匹配文件名、路径、对话标题、交付说明和备注；打开“搜索文本内容”后，还会读取文本文件的有限长度进行匹配。

点击文件名查看预览。图片、PDF、Markdown、Mermaid、文本/代码、CSV/TSV、静态 HTML 和音视频使用原生预览。Office 文件、压缩包及其他二进制文件交给本机“打开方式”，不进行任何格式转换。HTML 预览隔离脚本和网络访问；依赖外部脚本或资源的网页不保证呈现完整交互。

在独立标签列点击加号，或从预览的更多操作里打开标签编辑框；失败时保留输入，保存时合并重复标签。预览默认展开，文件信息按钮显示标签、收藏、备注和产出历史；保存标签不会清除未保存的备注草稿。产出历史只保存来源与元数据，不保存旧版文件内容。清单可导出为 Markdown 或 CSV；Markdown 链接可以粘贴回对话。

删除前会显示完整路径、大小和对话引用，并要求确认。操作只移入系统回收站，不提供永久删除。恢复时，请在系统文件管理器中取回文件到原路径，再点击“校检文件”，索引会解除失效/回收站标记。多版本引用指向同一个磁盘文件，删除会同时影响这些引用。

## 安装

已发布基线版本 0.1.0，可使用：

```sh
dsh plugin --profile web add dsh-artifact-center
```

目录审核期间可从仓库安装：

```sh
dsh plugin --profile web add github:YQing0123/dsh-artifact-center
```

安装后重启 Host 并刷新浏览器。`desktop` profile 由 Electron 管理，请使用桌面应用的插件管理器安装。市场收录还需要目录维护者审核，不等于 npm 发布后立即出现在市场中。

## 索引与限制

历史回填读取宿主 `sessionQuery.readSession()` 的完整事件，提取写文件、编辑文件与显式交付路径。实时索引在每轮结束后比较工作区快照，捕获 shell 和 subprocess 产物；超过默认 500 个变化文件的轮次折叠为批量概要。

首次快照只作基线，避免把原有源码和依赖全部误算成对话产物。没有留下路径记录的历史 shell 产物无法可靠补推；并行任务产生的快照变化也只能标为“推断”。旧格式日志如果被宿主迁移器拒绝，会单独显示错误，不修改原日志。0.1.2 起，独立血缘表保留已经记录的产物与用户元数据，派生列表缓存可以重建；进行中轮次的检查点跨重启保留，已落盘的结束轮次可恢复，恢复时排除结束时间之后修改的文件。删除整个存储域仍会同时删除血缘和标签备注。`enableBetterSidebar` 当前仅为预留配置，尚未接入该插件的委托预览；自带 Markdown/Mermaid 渲染可独立工作。

默认最多索引 50,000 条，普通预览上限 20 MiB，文本检索与预览默认读取 1 MiB。定期校检默认每 5 分钟执行一次。默认忽略 `.git`、`node_modules`、`dist`、`build`、`.next`、`__pycache__`、`.venv`、`target`、`.cache`、`.dsh`。

索引通过宿主 `storageDomain` 保存，存储域名称为 `artifact_center`。面板状态区显示回填进度、持久化情况和错误；文件字节路由同时检查宿主登录、同源请求、已索引记录以及对应工作区路径，拒绝工作区外的符号链接。

## 配置

插件 ID 是 `artifact-center`。可在 profile 的 `cordis.patch.yml` 覆盖 `ignorePatterns`、`burstThreshold`、`maxIndexedFiles`、`previewMaxBytes`、`textMaxBytes`、`backfillOnStart`、`snapshotOnTurnEnd`、`validationIntervalMs`、`readableExtensions` 和 `autoTags`。`readableExtensions` 是不带点号的扩展名白名单，面板左侧“可读取格式”会展示当前配置；空数组使用内置支持的全部格式。白名单之外的文件不会入索引，也不会参与内容检索。自动标签支持 `glob`（相对路径模式）、`ext`（扩展名）和 `session`（对话标题关键词）。示例见 [English README](README.md#configuration)。

## Agent 搜索

`artifact_search(query, workspace?, type?, tag?, since?, limit?)` 使用同一份索引，返回文件路径及对话元数据。`workspace` 可填名称或 ID，`since` 使用 ISO 时间，最多返回 100 条。该工具只读，不移动、修改或删除文件。

## 开发与验证

```sh
npm ci --legacy-peer-deps
npm run build:vendor
npm run check
npm test
npm pack
```

Host 与 UI 使用自包含 JS；Mermaid 使用独立 esbuild 配置，按需加载。渲染器与许可证已随包提供，安装不需要编译。不依赖 Harness 内部 UI 包。

当前真实验收使用 DSH `0.1.7-rc.2` 的干净开发 profile；桌面 `0.2.0` 仍需在其官方插件管理器中通过兼容性和界面验收。具体 API 校正、测试证据和发布状态见 [实现记录](docs/implementation.zh.md) 与 [验收记录](docs/acceptance.zh.md)。

## 许可证

MIT。第三方渲染器及其依赖许可证见 [第三方声明](THIRD_PARTY_NOTICES.md)。
