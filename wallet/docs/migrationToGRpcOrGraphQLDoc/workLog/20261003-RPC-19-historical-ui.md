# RPC-19 历史对象Provider与收据消费者

日期：2026-10-03。

共享WalletRpc新增可选归档能力，实际WalletRpcProvider按明确归档端点创建独立reader；未配置或无有效session时不暴露。能力不依赖GraphQL快照先成功，也不授予构建／发送能力。

receiptObjectEffects从原生V2 ObjectWrite／PackageWrite以及V1实体输出ref提取摘要。收据新增HistoricalObject消费者，只对实体写入且存在完整ID／版本／摘要开放用户查询。归档Object完整BCS验证后，再比较三项与交易effects一致；错误／缺位／错链／迟到响应不展示“核对一致”。UI中英文与缓存作用域已接入，不使用最新对象补历史。

## 验证

- 历史reader／消费者／Provider／收据4文件26项通过：[日志](./20261003-historical-ui-tests.log)。
- 原生effects映射旧精确对象断言因新增摘要字段失败，已补显式摘要期望，5项复验通过；[初始日志](./20261003-historical-effects-tests.log)、[最终日志](./20261003-historical-effects-tests-final.log)均保留。
- 完整TypeScript退出码0：[日志](./20261003-historical-ui-types-final.log)。
- 开发版Webpack成功20309ms：[日志](./20261003-historical-ui-build.log)，有既有Tailwind歧义类提示。
- 共享字段与消费者变更后执行全量：87文件976项全部通过，[完整日志](./20261003-historical-ui-full-tests.log)。

本批没有实际Chrome点击和可信发布归档入口历史对象请求证明，不将全量单测等同运行验收。RPC-19还包含checkpoint选择器等范围，仍未勾；总体16/98。
