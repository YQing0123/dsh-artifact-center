# 0.1.2 候选包发布与安装交接

当前候选包包含独立产物血缘、跨重启轮次恢复、搜索工作区访问撤销，以及侧栏滚动、自动toast、备注草稿保留等易用性修复。已发布的npm版本以官方registry查询为准，候选包本身不代表已经发布。

## 发布前检查（仓库根目录，本机终端）

```sh
npm ci --legacy-peer-deps
npm run check
npm test
mkdir -p .cache
npm pack --pack-destination .cache
npm run release:check
```

请先提交所有拟发布运行文件。`release:check`会逐字节核对候选包、工作区和Git HEAD，生成`.cache/release-receipt-<commit>.json`；若它拒绝旧包或未提交文件，先解决差异再继续。相同提交重打包若完整性不同会被旧收据拒绝，必须调查原因，不应删除收据绕过检查。

浏览器回归需要先启动隔离artifact-dev Host与artifact-p0浏览器，不能在无环境的机器上直接宣称通过。对应命令为`npm run test:ui`和`npm run test:locale`。`npm run test:native-trash`只适用于macOS，会创建唯一测试文件并执行真实Finder回收站往返，可能需要本机系统授权；不纳入无人值守CI。

## 用户在本机完成npm认证与发布

```sh
npm publish .cache/dsh-artifact-center-0.1.2.tgz --access public --registry=https://registry.npmjs.org
```

如npm要求登录或一次性验证码，只在本机终端或npm官方认证页面完成。不要把密码、Token、OTP复制到对话、脚本、工作流或提交。发布失败时保留错误码，不自动重试、不把本地完整性收据当作发布成功凭证。

发布后检查准确版本，而不是只查latest：

```sh
npm view dsh-artifact-center@0.1.2 version dist.integrity dist.shasum --registry=https://registry.npmjs.org
```

将返回的integrity和shasum与本地收据的integrity/SHA-1匹配，才可记录该候选包确已发布。版本已占用且完整性不同则停止调查，不能覆盖同名版本。

## 用户profile安装与验证

Web profile可使用官方CLI：

```sh
dsh plugin --profile web add dsh-artifact-center@0.1.2
```

安装后按宿主要求重启Host、刷新浏览器。Desktop profile由Electron管理，只从GUI插件管理器安装兼容版本；不通过CLI写desktop profile，不豁免不兼容版本，不写官方源码checkout。

安装验收包括：展开左侧各分组滚动到底；保存/复制操作toast自动消失；标签修改与备注保存；格式勾选刷新保留；在新对话中让Agent调用`artifact_search`并核对返回路径/来源。查看源码中的注册函数或单元测试不能替代实际Agent工具调用。

## CI和目录状态

仓库保留`docs/checks.workflow.yml`作为待启用模板：在Linux、macOS、Windows运行语法检查和Node测试；Linux额外打包并校验源码一致性、保留候选包及本地收据。当前GitHub凭据缺少workflow权限，推送`.github/workflows`被服务端明确拒绝，因此未启用Actions、没有远程CI通过记录。用户可在GitHub网页新建`.github/workflows/checks.yml`并粘贴该模板启用，不需要向对话提供Token。该CI不发布npm、不运行Finder、不证明桌面原生打开与所有媒体编码可用。

已有目录PR：https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/7329 。继续跟踪该PR，不重复提交；合并由目录维护者决定。可选better-sidebar增强和跨平台真实回收站验收仍按验收记录单独跟踪。
