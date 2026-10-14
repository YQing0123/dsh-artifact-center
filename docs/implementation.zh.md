# 产物中心实现说明

## 运行形态

插件保持纯 JavaScript、零构建入口：Host 逻辑在 `index.js`，索引与查询在 `core.js`，安全边界在 `security.js`，浏览器面板在 `client.js`。Mermaid、Markdown 和 DOMPurify 作为懒加载 vendor 随包发布。

## 数据与安全

索引使用 DSH `storageDomain` 的 `artifact_center` 域保存派生记录、会话游标和快照。文件读取、打开和移入回收站都要求 Host 浏览器认证、同源请求、注册工作区路径和符号链接路径校验。删除只调用系统回收站，不提供硬删除。

## 兼容边界

插件只硬注入 `webServer`，其余服务探测后降级；不依赖任何 `@deepseek-ai/dsh-client-ui-*` 包。`dsh-better-sidebar` 是可选增强，不属于必需 peer dependency。真实宿主验收需分别覆盖 web profile 与 Electron 管理的 desktop profile。

## 发布脚本

`scripts/github.mjs inspect` 查询仓库状态，`topic` 更新 `dsh-plugin` 等 topic，`submit` 创建 awesome-dsh-plugin 目录 PR，`pr` 查询已有 PR。脚本只使用用户本机 Git credential helper 的登录态，绝不打印凭据；认证失败时应由用户在本机完成登录后重试。
