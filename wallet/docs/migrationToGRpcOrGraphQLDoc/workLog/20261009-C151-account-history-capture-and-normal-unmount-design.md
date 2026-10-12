# 当前完整 cold/live 采集接续

C148 cold03已实际走完三资金入口和dApp持久拒绝/空闲原生锁上的trusted拒绝、正常Unlock/Reject/Disconnect/relock；实际三私有入口始终0，但整体false。唯一首次业务采集拒绝为生产account-history-protocol.ts的WalletAccountHistory只读query不在工具白名单；另一个在途请求是在整轮断言失败/关闭浏览器后失去APIRequestContext，未补正文，不计通过。

工具接续只增加该已存在的具名query，并限定/account/graphql路径；原query AST、query-only、固定摘要、URL/方法、零重试、预算和正文完整要求全部保持。冷和live实际/独立工具同步允许，保留所有旧失败。正常控制流程结束后将自有页面正常导航到about:blank，保留浏览器上下文直到原请求正文和真实取消/结束事件全部落盘，再移除自己的观察器并关闭浏览器。没有伪造响应、改钱包源码、修改journal或重放creator/批准摘要；完整业务/teardown须重新实际与独立审核才接受。
