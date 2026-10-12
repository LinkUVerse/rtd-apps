# 名称配置生产包的实际 Chrome 滞后拒绝与费用模拟

当前 C26 产品源码／1110 文件保持，名称 release revision5 是独立测试包，原 release revision4、原 dist／ZIP／已加载实例和所有原 profile 保留。

- [x] 实际新包 UI／worker 精确来源及四查询角色 HTTP200／同 H0；[Chrome 身份证据](./20261006-name-production-chrome-02.json)。
- [x] [当前页面 8 项](./20261006-name-lag-ui-04.json)：导入受控已有资金账户、选择本地网络，显示 1.5 WMIG；输入 `wallet-migration.rtd` 和 `leaf.wallet-migration.rtd` 时地址仍保留名称文本，检查按钮禁用；换成原受控目标地址后检查按钮启用。当前实际费用模拟 2 次、签名／Execute／证书变更均为 0，没有点击检查或批准。
- [x] [独立离线审核](./20261006-name-lag-ui-audit-01.json)：重新解码两次真实 gRPC-Web 帧及成功 trailer；两次 checks=ENABLED、effects.success=true。最终请求 BCS、响应 BCS、digest、sender、recipient、gas owner／payment／price／budget／Validity 同链一致，WMIG 收款变化 1 原子、发送变化 -1 原子，原生余额变化与净 gas 一致。166 个原请求全是允许的本机四端口；独立审核 0 网络／模拟／签名／派发。
- [ ] 正面名称解析／默认反向／缺失过期／续期改名／最终目标确认。查询快照仍是 726884，真实名称 seed checkpoint1015260 尚未覆盖。

失败保留：[01](./20261006-name-lag-ui-01.json) 和 [03](./20261006-name-lag-ui-03.json) 的普通地址检查禁用，是测试主动拦截 SimulateTransaction 导致费用预览无法形成，不能归因为目标地址余额、名称配置或产品失败；[02](./20261006-name-lag-ui-02.json) 未等待实际 metadata 读取完成。原工具、日志、profile 和整体失败状态保持。04 允许正式检查启用模拟并继续阻止 Execute／公网／JSON-RPC，未放宽交易检查。

[独立原生余额](./20261006-name-ui-gas-components-01.json)分别证明 source 的 Coin 资金和 target 的 address 资金，不能把 target 的 Coin=0 解释为总余额=0，也不能据此推导此前禁用原因。真实服务名称 lag 拒绝另见[生产 Reader 两案](./20261006-name-actual-lag-progress.md)，页面证据不冒充名称正面查询。

本批为 QA-A15 的有限子项，父任务仍未完成。总体 **78/98（79.6%）**、余 20、trial_ready=false；正常 HTTPS 和自定义网络权限仍待原确认。
