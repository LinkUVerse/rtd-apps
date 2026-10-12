# C201 原路径升级与 C202 独立 profile TLS 实测

用户明确批准两项最终动作后执行，未重复请示。C201 保留原扩展路径、ID、测试账户、权限配置；完整 C198 产物归档保留。正常扩展管理页停用、文件升级、启用和重新加载均有实际记录。用户已再次自行解锁。

- 安装：`20261010-C201-ordinary-upgrade-installed-01.json`。
- 来源绑定：`20261010-C201-installed-ordinary-browser-binding-01.json`。
- 普通 Chrome 实际 UI 和后台加载脚本逐字节与构建一致：`20261010-C201-ordinary-bytecode-01.json`。仅只读 Debugger 代码核验，无 Runtime/DOM 求值或凭据读取。
- 原生界面：`20261010-C201-ordinary-upgrade-native-ui-01.json`。实际账户保留、用户解锁、活动页显示覆盖窗口与窗口内无活动。观察到后续窗口 0–780064；不把该后续 UI 窗口冒充 HAR 的 779920。
- 脱敏原生 HAR：`20261010-C201-ordinary-activity-network-01.har`；离线完整历史协议审核：`20261010-C201-ordinary-history-audit-01.json`，由 `scripts/audit-C201-ordinary-history.py` 可复查。

HAR 共 14 请求，其中 12 个完整 GraphQL 响应解析成功。账户页上界 779920、前后相同 checkpoint digest、5 项查询覆盖范围包含该 S、两次账户覆盖满足窗口、owner/H0/分页/空结果/覆盖标志完整一致。1 个中断请求明确不计通过；另 1 个原生 gRPC 请求不在本次历史审核的成功范围内。账户覆盖 `allAccountActivityCertified=false`、`registrationComplete=false` 保留，不能称账户历史全集已证明。

活动页初次长等待以及后续刷新重新出现 loading 仍观察到，控制台出现过 GraphQL 504。本次已证明正常查询能够最终返回，未证明间歇性网关问题解决，也未直接原生观测 C201 新增的准入阻断提示分支。该分支由已有确定性 53 项回归支撑；P201-3 的构建/安装/实际新构建验证已完成，不扩大到 ENV/QA 父验收。

## TLS

用户批准的公共 CA 通过 Chrome `certificate-manager/localcerts/usercerts` 导入 C51 自定义可信证书。实际指纹为 `3bd1655519c6e6dd2837ba19e903ed21f93216ea60d8c1b6079f23cff3aae4b0`。自定义证书由 0 变为 1，macOS 导入数量保持 7，未操作系统或登录钥匙串。

普通 Chrome 访问 `https://127.0.0.1:41903/archive/rtd.rpc.v2.LedgerService/GetServiceInfo` 后，网站信息显示“连接是安全的”。GET 返回 HTTP 404，只证明 TLS 成功，不证明 gRPC 调用成功。

同一端口使用 `https://wrong-san.localhost:41903/archive/rtd.rpc.v2.LedgerService/GetServiceInfo`，浏览器拒绝并显示 `NET::ERR_CERT_COMMON_NAME_INVALID`。未点击高级继续、未绕过警告。在线公开服务证书 SAN 只有 `wallet-archive-bridge`、`localhost`、`127.0.0.1`。

证据：`20261010-C202-profile-ca-imported-01.json`、`20261010-C202-ordinary-tls-observation-01.json`。扩展 worker 实际网络、扩展 HTTPS host permission 允许/拒绝、完整自定义网络和 demo CORS 仍须单独验收，P202-2/ENV-07/QA-A19 保持开放。

## 环境及剩余工作

当前 C198 授权网关范围只读校验通过：36 个原进程、116 个原容器、24 个健康基础依赖，其他 115 容器状态保持，未杀进程或清理仍被引用的容器。未修改发布器与重放消费者，未把待发布数据视为正式覆盖。

签名授权与持久恢复 12/12（100%）；总体仍 91/98。名称新鲜度、完整 709570 检查点重放及全量对照/冷恢复条件保留，详见当前阻塞台账。普通浏览器授权及 worker 真实请求继续推进，不能用 Node 查询或静态脚本核验代替。
