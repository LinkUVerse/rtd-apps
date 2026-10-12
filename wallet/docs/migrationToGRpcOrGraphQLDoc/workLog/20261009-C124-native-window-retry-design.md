# C124 非NFT签名准入历史窗口有界重读

主人要求一期所有非NFT先验收，NFT专项保持第二阶段。原98任务及权重、正常90秒等待和30秒结果租约不变。

C123正常顺序诊断实际在第六组stake/expirationNone失败；五个已返回签名、十次配对模拟、五帧原生验签、35变异拒绝独立通过。失败组仅预览模拟，无最终模拟及验签。后台原回包为WalletNativeReadWindowChangedError，原生帧H0相同、历史下界153386前进至153412。此结论仅适用于C123，不推断C119/C122根因。

Sui官方full-node文档说明历史保留期可配置；官方get_service_info.rs返回实时最低可用checkpoint，reader.rs取checkpoint与object保留下界的max。RTD当前源码相同。这是正常裁剪状态变化，不能作为错链永久隔离；也不能接受读期间变化的旧报告。

实施限定为assertTransactionMoveAdmission内部完整probeDeploymentCapabilities只读探测：只捕获准确WalletNativeReadWindowChangedError一次，先确认原fetch全部物理结束，再用同一ticket、同一fetch/lifetime、同一session/原始总AbortSignal完成一次新全量探测。原报告丢弃。总30秒不重置；第二次变化、错链、倒退、预算、取消、ABI/pin负面均按现有合同拒绝。原始bytes、final模拟、account.signData、Execute、journal、租约不重放。原生probe断言保持原样。

测试使用实际SDK protobuf/BCS协议而非mock探测结果：一次窗口前进后稳定重新读取所有包、单ticket仅完成一次；连续变化最多两次然后安全失败；第二次错链锁定；字段缺失/回退不重读；重读中取消/原总期限到达不延长；改变ABI或release pin按新读取负面拒绝，保留所有已有管线/网络/持久化安全测试。

执行顺序：冻结当前1122产品源、两份目标源、C109构建/资格、C123原始/独立证据及官方commit；先回归问题红灯，再修改与绿灯；production TS与RPC闭包、隔离production build和完整source map/graph来源资格；最后新fresh七门及原12签名/39模拟/12原生验签正常矩阵。工具资格及unit/build不算当前UI通过。所有失败保留，原父/完整冷恢复及名称目标不降级。

官方参考：https://docs.sui.io/operators/full-node/sui-full-node ，https://github.com/MystenLabs/sui/blob/main/crates/sui-rpc-api/src/grpc/v2/ledger_service/get_service_info.rs ，https://github.com/MystenLabs/sui/blob/main/crates/sui-rpc-api/src/reader.rs 。官方源码固定commit与SHA见本批baseline证据。
