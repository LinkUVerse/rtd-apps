# NET-10 Explorer共享core实际解析

## 发现与修复

此前只记录工作区core的19项错误不足以证明Explorer的实际状态。本轮执行Explorer完整tsc，191项错误，其中实际解析路径是node_modules/.pnpm内file:core副本；该副本的useFormatCoin仍引用工作区中已不使用且副本缺失的WalletDataProvider。

修改rtd-explorer/src/explorer/tsconfig.json paths与vite.config.ts alias，使rtd-apps-core根导入及深路径均指向../../../core源码。保留现有file依赖，不改node_modules，不恢复旧SDK或旧Kit，不改业务页面。

## 证据

- core当前完整tsc：19项错误，退出2，20261004-core-consumer-baseline.log。
- Explorer修改前完整tsc：191项错误，退出2，20261004-explorer-consumer-baseline.log。
- 使用TypeScript真实resolveModuleName和Vite真实createResolver核对core根入口及KioskClientProvider深路径，均解析到当前core且passed=true：20261004-explorer-source-resolution.json。
- 修改后Explorer完整tsc仍191项，退出2，但无pnpm file:core副本诊断、无旧WalletDataProvider缺失诊断：20261004-explorer-source-resolution-typecheck.log。消除副本偏差不等于修好旧接口，不能宣称错误数减少或构建通过。

## 消费者与下一步

Explorer Layout直接使用core KioskClientProvider；OwnedObjects使用根导出的useGetKioskContents，且依赖旧ObjectResponse数据；OwnedCoinsPanel使用useGetCoins；TotalStaked使用useGetDelegatedStake；Validators与ValidatorDetails使用APY和验证者事件；DynamicFieldsCard和TokenView使用动态字段。故不能删旧hooks／替换DTO而不改消费者。

剩余类型诊断有旧JSON-RPC DTO从现代client入口导入、旧dApp Kit查询／钱包Provider、Kiosk Network枚举和objectOptions。先将仍属Explorer旧模型的类型导入明确指向SDK jsonRpc类型出口，再处理Provider及Kiosk数据合同；不把运行时客户端混装为钱包迁移完成证据。NET-10仍未完成，本轮无Explorer运行／Chrome验收。
