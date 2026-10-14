# 产物中心实现与验收记录

> 插件：`dsh-artifact-center` / `artifact-center`  
> 本轮候选版本：`0.1.1`  
> 更新日期：2026-10-14

## 结论

P0–P7 主体功能已经实现，但不能把全部冻结验收项标成完成。本轮确认了真实 web Host 启动、列表与 Markdown/Mermaid 预览，并补上扩展名归一化、历史版本标题同步、清理失效记录后的恢复回填、超过100项批量回收站分批和缺失服务诊断等修复。

## 已发布基线（公开端点核对）

2026-10-14 查询公开 npm registry，`dsh-artifact-center/latest` 为 **0.1.0**。
GitHub 仓库已有 `artifact`、`deepseek-harness`、`dsh-plugin` topic。
目录 PR **https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/7329** 为 open、尚未合并。
这些属于已完成的基线发布，不应重复创建目录 PR。

## 真实 Host 与浏览器证据

- 隔离 `artifact-dev` profile 启动成功，版本 `0.1.7-rc.2-9d21963`。
- 全局面板能在无活动会话时打开，列出8个工作区。
- 状态接口：处理265/265份会话，145条索引，持久化可用。
- 两份旧会话被宿主迁移器拒绝：历史格式v0的 `message-edit/version` 事件不被识别。插件逐会话记录错误并继续回填，不修改原日志。因此这不是全部历史会话均成功回填。
- 真实 Markdown 文件渲染出标题与正文，没有预览错误。
- Mermaid 测试在真实浏览器中拦截文本响应注入最小测试围栏，确认懒加载后出现SVG。未修改真实文件。
- 搜索空态、清除筛选、收藏分类入口已验证。
- 批量回收站测试在浏览器中模拟101项列表与删除响应，确认请求拆成100+1；没有删除真实文件。

## 代码覆盖与尚未验收项

| 阶段 | 实现与验证 | 未闭环部分 |
|---|---|---|
| P0 技术验证 | 真Host启动、侧栏挂载；认证/同源/路径/Range/CSP集成测试 | desktop宿主验收；所有原生打开方式与系统回收站实测 |
| P1 索引 | 历史write/edit/present、实时快照diff、爆量折叠、游标、校检 | 快照来源记录没有独立血缘日志；删除索引后不能重建shell-only历史，崩溃期间文件不能可靠归属 |
| P2 面板 | 分类、搜索、虚拟列表、排序、进度 | 万条列表性能与深浅主题专项验收 |
| P3 预览打开 | 自带各格式渲染与系统打开接口，Markdown/Mermaid浏览器通过 | PDF/CSV/媒体/原生应用与错误态的完整浏览器矩阵 |
| P4 元数据 | 标签、收藏、备注、版本、失效与清单导出；回归测试 | 全部交互的浏览器回归 |
| P5 回收站 | 二次确认、跨平台命令、分批、恢复校检 | 真实系统回收站与恢复验收；仅模拟了批量请求 |
| P6 Agent工具 | artifact_search注册与结构化检索测试 | 真实Agent工具调用验收 |
| P7 发布 | 0.1.0已发布、topic已设置、目录PR已开 | 本轮补丁版本发布收据；目录维护者合并 |

## 需求差异与限制

- `readableExtensions` 是当前实现与README明确的索引白名单，不只是预览能力表。白名单之外的显式交付也不进入索引。此行为比最初FR-A3/A4的“全部路径”范围更窄，需按后续白名单产品决策核对，不应静默移除该能力。
- `enableBetterSidebar` 尚未接入，不能宣称可选增强完成。自带Markdown/Mermaid不依赖它；已查询运行时契约但当前没有可查询的betterSidebar服务。上游公开服务主要是会话侧栏viewer注册，不能直接假设能在无会话全局面板中委托其渲染。
- 不转换Office文件；版本时间线保存产出来源与元数据，不保存旧版文件内容。
- 启动快照基线不把停机期间的任意工作区变化归因于某个会话。FR-A9/A10的完整崩溃恢复与血缘重建需要独立持久化设计，尚未完成。

## 本轮补丁验证与发布

- `npm run check` 通过；`npm test` 18/18通过。
- 已生成 `.cache/dsh-artifact-center-0.1.1.tgz`，SHA-1为 `52a9c1164419a5f7a77a9fb1edf9c17312d918c4`。
- 本机 `npm whoami` 成功，但发布返回 `EOTP`。因此0.1.1尚未发布，等待用户在本机终端完成一次性验证码验证。不要将验证码发送到对话。
- 本机命令：`npm_config_cache="$PWD/.cache/npm" npm publish .cache/dsh-artifact-center-0.1.1.tgz --access public --registry=https://registry.npmjs.org`。如交互要求验证码，仅在本机终端完成。

## 本轮权限问题

Host首次启动被工作区沙箱拒绝写入 `~/.dsh/profiles/artifact-dev/cordis.yml`，授权后启动成功。
浏览器首次测试被拒绝写入 `~/Library/Caches/ms-playwright/daemon`，授权后浏览器与面板均正常。
第一次npm打包命中不可写的用户缓存；采用工作区 `.cache/npm` 后打包预检通过。没有修改用户npm缓存权限。

认证只使用用户本机已有登录态；如需重新登录或OTP，只由用户在本机操作，不索取或输出密钥。
