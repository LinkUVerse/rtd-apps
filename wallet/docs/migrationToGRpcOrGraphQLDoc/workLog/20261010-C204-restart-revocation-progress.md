# C204 普通 Chrome 完整重启、实际撤权与剩余阻塞

## 完成事实

原普通 Chrome PID 81929。第一次 Cmd+Q 没有结束进程，启动器按仍存在的原进程严格拒绝；未并行启动第二套浏览器。通过 Chrome 菜单正常退出后，以官方签名可执行文件和同一独立 C51 profile 启动 PID 67962。未读写 profile 数据库、未修改系统信任、未输入密码、未重装钱包。

重启后原生证书管理器仍显示 RTD local workspace CA，完整指纹保持；原测试账户和 c51-tls-acceptance revision1 的四地址、H0、generation、同链合约配置均保留。表单显示下一版本2，未额外保存新版本。实际 UI/worker 加载代码与 C201 审核产物一致。

- `20261010-C204-existing-ordinary-chrome-started-01.json`
- `20261010-C204-installed-ordinary-browser-binding-01.json`
- `20261010-C204-ordinary-bytecode-01.json`
- `20261010-C204-restarted-ui-audit-03.json`：64 请求，61 完整响应，3 不完整排除；7 原生/4 归档 ServiceInfo、23 GraphQL H0、1 账户覆盖完整审核。UI 真正使用归档 HTTPS。
- `20261010-C204-restarted-worker-audit-01.json`：新 worker 实际3条预检，2个完整 gRPC消息及唯一成功 trailer、GraphQL H0一致；HTTPS权限和证书在完整重启后继续生效。

首次和第二次 HAR 的唯一账户覆盖 HTTP200 未捕获正文，严格审核均拒绝，原 HAR 和两份失败说明保留。不能靠等待推断正文已获得。之后通过浏览器“重新加载”按钮产生新请求，第三份 HAR 完整账户响应才通过。没有降低审核条件或覆写旧失败。

## 站点权限撤回

Chrome 扩展详情将测试扩展站点访问由原“在所有网站上”改为“点击时”。实际重新加载后，归档 HTTPS 两次 POST 均 `net::ERR_FAILED`，相应 OPTIONS 为 HTTP200 但没有 `Access-Control-Allow-Origin`，控制台明确 CORS preflight 拒绝。钱包可见“余额读取尚未通过网络校验”。这是撤回 host 访问后的浏览器拒绝，不能误写成 TLS 证书错误。

证据：`20261010-C204-revoked-ui-https-01.har`、`20261010-C204-site-revocation-audit-01.json`；独立于 C203 新权限请求取消反例。本次只证明 UI 撤权网络反例，未伪称 worker 撤权抓包。

**当前受用户最终确认约束的操作**：恢复该独立 C51 测试扩展原站点访问设置。下拉菜单已在最终选项处准备；已询问用户。工具要求恢复安全访问权限时确认，尚未获得回复前不自动恢复，不把正常试用状态记为已还原。用户确认后恢复原设置，再验证 HTTPS 正常读取和保留的原配置。

## 进度与其余工作

ENV-07 的“普通Chrome初始化与正确TLS”50%细分包已由 `20261010-C204-ordinary-init-tls-completion-01.json` 完整证据收口；ENV-07 父项仍开放，另50%在权限恢复/末验后审核。签名恢复12/12（100%），98父项仍91完成；没有把局部进度冒称父项完成。

QA-A19 保留 demo网页 CORS 及剩余权限/TLS完整矩阵；当前扩展 host 访问成功不能替代普通网页 CORS。C201新活动页准入提示现已有实际切网/重载观察，先前日志“未原生观测”仅代表早期时点。

最新41持久管线最低194946，覆盖194947/709570=27.474%；只读查询及当前36进程/116容器归属检查通过。正式published1006768、pending1482841、prepared33680，发布锁实际1；原publisher父93647/子14257仍存在，不能交接或清理。固定全重放、全量对照/物理归档/WAL、名称新鲜度仍为真实阻塞，未放宽门槛。水位证据及当前状态已更新；没有重放交易、没有签名或Execute。

- [x] P204-1：普通Chrome完整重启、原CA/账户/自定义配置/权限与实际UI/worker请求。
- [x] P204-2：当前UI实际站点撤权拒绝及原HAR审核。
- [ ] P204-3：用户批准恢复原站点访问后，正常读取末验与ENV父项完整审核。
