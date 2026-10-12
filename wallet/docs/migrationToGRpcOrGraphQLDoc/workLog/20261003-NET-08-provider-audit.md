# NET-08 钱包自有Provider与旧Kit移除审计

日期：2026-10-03。

## 完成判据与证据

1. 自有WalletRpcProvider：src/ui/index.tsx根树以明确selection注入自有Provider，没有再挂旧RtdClientProvider／KioskClientProvider或自动连接自身钱包的WalletProvider。
2. 共享领域接口注入：core/src/rpc/WalletRpcContext.ts定义钱包读／准备接口；core/src/rpc/asset-hooks.ts、receipt-hooks.ts、staking-hooks.ts等消费该接口；实际Provider以session、Fullnode／GraphQL／归档reader实现。已有Provider与领域集成测试验证此链路。
3. 插件旧Kit移除：生产src扫描没有旧Kit导入／useRtdClient／useRtdClientQuery／旧Provider；移除wallet/package.json中无消费的rtd-dapp-kit，并精确删除pnpm-lock.yaml的wallet importer同一依赖。其他应用、共享core和锁文件全局仍需要的旧依赖保留，归NET-09／10完整依赖闭包与其他消费者审计。
4. 当前包声明重新开发构建成功21994ms，[构建日志](./20261003-NET-08-build-final.log)。四个入口source map均无旧Kit模块路径：ui2047、background1008、content-script58、dapp-interface81个源条目。

新增可重跑scripts/audit-wallet-provider.py；[结构化审计](../evidence/20261003-NET-08-provider-audit.json)保存包及每个source map的SHA-256与范围。此前当前业务源码全量87文件976项测试通过；本批仅删除无消费的声明及对应importer，重新验证实际打包图，不把旧安装目录存在的缓存当新依赖证明。

## 验收边界

本项证明钱包Provider替换和插件旧Kit生产闭包移除，不宣称整个工作区清洁安装通过、所有应用无旧Kit或动态网络无JSON-RPC。未执行clean install；当前仍保留其他应用的旧包声明／安装问题，NET-09／10和REL独立待验。环境、Chrome实际交易、发布门禁未完成，试用门槛未达到。

依Task原定义，NET-08编码范围现完成，勾选后总体17/98。
