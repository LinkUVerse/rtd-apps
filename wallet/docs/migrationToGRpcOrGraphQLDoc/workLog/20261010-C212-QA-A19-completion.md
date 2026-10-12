# C212：QA-A19 普通 Chrome 权限、TLS 与网页 CORS 收口

## 真实缺口与实施

C205 已完成普通 Chrome 新装、原路径更新、权限批准/拒绝、自定义网络、正确CA/错误SAN、UI和worker真实三入口；其demo只能证明节点成功和私有入口拒绝，尚缺获准网页来源正例。

本轮沿用同一个独立 C51 普通 Chrome（154.0.8037.98，PID67962），当前安装仍为C210。现有 C51 钱包入口41957/41958/41959分别连接既有GraphQL、归档和账户服务。在该开发网关仅临时添加精确Origin `http://127.0.0.1:41960`，没有新增代理或容器、没有改上游/TLS/客户端身份；网页没有覆盖Origin或借用扩展发请求。静态demo不连接钱包、不签名、不执行交易。

这是显式白名单配置下的真实浏览器CORS验收，不声称原默认配置允许任意网页，也不声称浏览器绕过私有mTLS上游。C205对直接HTTPS归档41903的拒绝证据继续保留，C212正例使用本来就在编译profile中的归档开发入口41958。

## 三轮结果

- 获准来源 `http://127.0.0.1:41960`：4 POST全200，4 OPTIONS正常；节点与归档完整gRPC message/trailer解析，唯一grpc-status=0且H0相同；GraphQL创世摘要、账户覆盖正文无错误。
- 未获准来源 `http://localhost:41960`：原生节点仍按其开发策略ACAO=*允许；三个私有入口OPTIONS403，Chrome阻断POST，HAR状态0/ERR_FAILED，网页无法读取。
- 恢复原配置后原获准来源重试：三个私有入口再次403/Chrome阻断，证明临时授权已撤回。

证据为`20261010-C212-demo-allowed-01.har`、`demo-denied-01.har`、`demo-restored-01.har`，共24条；独立正文审核`20261010-C212-demo-cors-audit-01.json`通过。未将HTTP成功但业务错误算通过。脚本`scripts/audit-C212-demo-cors.cjs`只离线解析原生HAR。

## 故障与清理

初次01准入操作在nginx graceful reload尚未完成时观察到旧worker结果，被断言拒绝并自动恢复。02版本等待精确正反例就绪；恢复时同样出现一次即时观察过早，但文件已恢复。随后只读`audit_wallet_C212_restored_origin.py`确认原SHA、容器身份、三入口403，浏览器第三轮也验证了拒绝，未用配置文件存在替代运行效果。

初版HTTPServer被浏览器空闲连接占住，localhost导航未完成；只结束本次自有静态进程，改用ThreadingHTTPServer后导航成功。测试完关闭demo标签页并停止PID40669，41960无监听。原C210钱包首页仍可用，原容器/链/发布/重放进程没有重启。

完整运行证据目录：`~/.local/state/rtd-wallet-migration/dev-20261006-03/publication-foundation/C212-exact-demo-origin-20261010-02`。原配置全文保留，最终原SHA为`fd768a23a70737e1caea178636151f6f74d4e4b4abba172b102885391e342a1e`。

## 父项收口

`scripts/audit-C212-QA-A19-completion.py`核验C205权限/TLS与UI/worker证据及SHA，本轮完整CORS正反例和恢复，当前C210安装字节/原进程身份、manifest与权限保持，静态服务/端口关闭。`20261010-C212-QA-A19-completion-01.json`通过，QA-A19完整完成；P205-4也收口。总体93/98，试用期间真实回归19/22。

C211候选并未安装；性能全页面验收、QA-A15/A17/A20、REL-02/05仍开放，不被本次权限与CORS完成代替。
