# C131重启后孤立dApp请求正常关闭修复

实际前置：C130两轮均在Approve之前由测试断言拒绝，0签名/Execute；真实当前C124的同受控profile保留两条execute mode待授权元数据。正常锁定UI“关闭请求”已关闭窗口，但chrome.storage.transactions原请求仍在，清理01失败保持。源码Transactions.handleMessage仅Subject.next，原requestApproval监听/生命周期不能在worker重启后恢复，孤立请求没有监听者执行finally.removeTransactionRequest；三小时stale清理不替代用户当次关闭。该修复针对请求元数据，任何durable journal不允许删除。

- C131-1：修改前C124/1122、完整manifest、三待改文件及development dist/旧隔离产物、所有当前失败证据封存；原C129资金链路和旧产物不改写。
- C131-2：先以真实Transactions入口创建并结束原监听，再恢复其持久元数据模拟重启，补充孤立false只删除对应请求/保留其他请求、孤立true不发布也不删除、缺失id不影响其他请求三红测；保留原全部测试。
- C131-3：handleMessage保持同步发出原Subject事件，仅approved=false且当前无原requestSignals时撤销该请求prepared并await串行remove；UiConnection await该Promise、走原错误通道。不得主动签名、构建、重发、删除journal或放行孤立true结果。完整源码三文件逆变换、原1119其他文件、原批准/门禁/取消/费用语义及期限保持。
- C131-4：相关后台/执行授权回归、RPC和完整生产类型、隔离production构建和完整source-map/闭包；unit/build不代替普通UI关闭。当前新来源明确与C124历史证据分离，旧实际资金链路保留。
- C131-5：准备新来源查询准入，真实当前构建创建未批准请求、完整冷关闭与cipher/journal保持实机；再继续C130普通Coin自然pending与cold四入口、完整非NFTM5。原98、fine及第一阶段全部条件不缩减，NFT专项第二阶段。

C129三旧查询/guard在资金链路完成且当前测试因源码修复暂停后确切正常清理，以免无用常驻；原两RTD/indexer不同H0/存储和C120完整恢复中间件继续保留。不得删未知容器、卷或镜像。需要新版dev时继续最新rtd debug与link-u-smart-contract部署内容。
