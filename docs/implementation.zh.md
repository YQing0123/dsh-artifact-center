# 产物中心实现说明

## 运行形态

插件保持纯 JavaScript、零构建入口：Host 逻辑在 `index.js`，索引与查询在 `core.js`，安全边界在 `security.js`，浏览器面板在 `client.js`。Mermaid、Markdown 和 DOMPurify 作为懒加载 vendor 随包发布。

## 数据与安全

索引使用 DSH `storageDomain` 的 `artifact_center` 域。0.1.2将域规格升级为v2并声明兼容v1：`provenance`保存权威产物记录与用户元数据，`artifacts`为可重建的列表缓存，`active_turns`保存每轮独立基线，`cursors`和`snapshots`仍保存回填游标与工作区快照。产物先写血缘再写缓存；检查点在快照处理完成后才删除。升级时已有v1列表记录被纳入血缘表。清理失效项只隐藏其血缘记录，文件恢复后校检会恢复标签、收藏和备注。删除整个存储域无法保留这些数据。

启动时只对有持久化轮次检查点且有已落盘`turn/end`事件的轮次自动恢复，并排除结束时间之后修改的文件；没有结束事件的检查点保留，等待同轮结束。此机制无法复原文件的旧字节，也不将任意现存文件推定为历史产物。

文件读取、打开和移入回收站都要求 Host 浏览器认证、同源请求、注册工作区路径和符号链接路径校验。删除只调用系统回收站，不提供硬删除。

## 兼容边界

插件只硬注入 `webServer`，其余服务探测后降级；不依赖任何 `@deepseek-ai/dsh-client-ui-*` 包。`dsh-better-sidebar` 是可选增强，不属于必需 peer dependency。真实宿主验收需分别覆盖 web profile 与 Electron 管理的 desktop profile。

## 发布脚本

`scripts/github.mjs inspect` 查询仓库状态，`topic` 更新 `dsh-plugin` 等 topic，`submit` 创建 awesome-dsh-plugin 目录 PR，`pr` 查询已有 PR。脚本只使用用户本机 Git credential helper 的登录态，绝不打印凭据；认证失败时应由用户在本机完成登录后重试。
