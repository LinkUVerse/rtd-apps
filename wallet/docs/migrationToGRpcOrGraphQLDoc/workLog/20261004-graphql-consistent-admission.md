# 2026-10-04 GraphQL 内部 consistent 准入切换

通过 link-u-smart-contract/all-in-one-deploy/localDeploy/route_wallet_consistent_admission.py 核对原 GraphQL PID、启动时间和完整参数，先检查39602入口和consistent准入，然后仅停止原GraphQL进程。原process.json与launch-intent保存在native-query-stack/query-route；所有DB不变，indexer65781和consistent65784保持运行。

wallet_query_route.py绑定准入URL39602及ingress manifest SHA，启动时验证所有配置文件；start_wallet_certified_query.py使用此显式变更记录。当前源码debug provenance校验通过后新GraphQL PID58173运行，内部请求经过39602→39592准入→39541。

实际钱包WalletAssetReader通过外部TLS GraphQL39600执行共同快照、系统对象、账户余额及账户对象读取，checkpoint100、5个账户对象，通过。证据见[真实钱包读取](../evidence/20261004-guarded-query-snapshot.json)。探针原scope文字仍保守写private backend；本次命令实际使用https://127.0.0.1:39600/graphql并提供私有CA，未禁用TLS校验。此为Node运行时真实钱包模块证据，非Chrome验收。

两项路由测试通过：显式绑定／配置漂移拒绝、非批准地址拒绝。consistent自身读取x-rtd-checkpoint-height而非x-rtd-visible-checkpoint；其安全依赖认证检查点消费与新鲜发布准入，GraphQL继续携带共同快照高度，不能将注入后者描述成consistent原生强制上界功能。

继续实际扩展Origin、GraphQL浏览器CORS、Fullnode入口及完整核心链路，18/98保持不变。
