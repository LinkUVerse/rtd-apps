# RPC-24／NET-03：当前网络入口探测迁移

日期：2026-10-03，部分任务推进。

## 实施

- useRestrictedGuard 移除硬编码 testnet URL 和原始 JSON-RPC 请求。通过 WalletRpcProvider 当前读会话探测 profile.fullnodeGrpcWeb 的 gRPC-Web LedgerService/GetServiceInfo。
- 探测成功必须验证完整 H0 与 u64 checkpoint，HTTP200／非零 gRPC status、错链、缺高度都不作为可访问。结果只表明该 Fullnode 入口，不声明 GraphQL／archive／执行已就绪。
- HTTP403 且正文严格等于原有 `error code: 1020` 才映射 restricted，正文读取长度受限；其它403、服务故障和网络错误保持查询错误。此为现有入口政策匹配，不把通用 gRPC 错误推断为地域限制。
- probe 使用10秒超时、会话和调用方取消，禁止重定向／凭据。当前profile、读会话限定查询键，禁持久缓存；GraphQL尚未准入时仍可探测Fullnode。
- 路由只凭明确restricted跳限制页，限制页只凭身份验证成功的accessible返回主页；错误／新会话／未配置不能把旧限制页误清除。会话关闭丢弃迟到结果。

## 验证

- 10项真实SDK gRPC-Web帧／传输测试，3项真实React＋QueryClient路由测试。覆盖当前endpoint、精确H0／大额高度、精确403／1020、其它403／503／超长body、gRPC trailer失败、错链、取消、缓存隔离和迟到结果。
- 完整定向回归53文件、669/669通过。新增接口导致旧coin测试夹具缺属性，已补齐并定向复跑该夹具通过；最终完整类型检查重新执行。
- RPC tsc exit0；完整钱包 tsc exit2，111条诊断，直接变更文件无诊断。[证据](../evidence/20261003-entry-access-verification.json)。
- AST655文件、30个生产方法候选、2个生产线协议字面量（前3）。不代表依赖或产物清零。
- 未启动dev、部署合约或测试真实链／Chrome扩展。受控Fetch的入口判定不是生产地域政策验收。

## 下一步

继续dApp事务批准、现代签名返回契约、Qredo／OriginByte与其他可达旧接口，随后按指定debug源码及合约脚本建立真实核心测试证据。RPC-24整体不据入口子项勾选。
