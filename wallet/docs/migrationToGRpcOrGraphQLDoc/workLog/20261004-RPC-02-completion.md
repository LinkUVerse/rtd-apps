# RPC-02 批量对象合同核验（2026-10-04）

## 条目结论

RPC-02完成：逐项Error保持输入位置，不把缺字段／依赖失败伪造成缺对象；包括资产GraphQL批量与指定历史版本归档批量，交易输入仍走Fullnode当前状态。此结论限定接口编码与合同核验，真实Chrome页面操作由TRY继续验收。

## 代码与消费者

- WalletAssetReader.objects保持规范ID顺序和重复项，20项一批，共同快照读完后再次复验。只有显式null映射notFound；缺槽位、错ID、缺Move内容或GraphQL错误拒绝整体结果。
- useMultiGetObjects保留整个结果数组；HiddenNftsPage按输入位置显示逐项错误，不过滤后重新关联ID。Kiosk reader对其必需对象的逐项Error拒绝，避免不完整持有列表被误认为完整。
- 本次修正useAssetQuery：查询刷新失败后隐藏此前成功data，防止消费者同时取得失败状态与旧批量对象。新增实际React Query刷新回归，先得到成功与notFound槽位，再制造GraphQL部分错误，最终data为空且isError=true。
- WalletArchiveObjectReader采用显式objectId/version，逐项gRPC错误保留选择器，完整BCS与摘要核验成功项；批量缺项、空oneof、版本／ID错配、覆盖变化拒绝，不替换为latest。readHistoricalEffect与HistoricalObject已使用该合同核对交易effects指定版本／digest。
- 构建器使用当前Fullnode客户端，其最终字节正式模拟与近期实际执行证据见地址资金迁移日志；未从上述展示／历史缓存取交易引用。

## 证据

1. 资产批量真实GraphQL跨三批43项历史证据：../evidence/20261003-batch-objects-live.json（是此前明确快照的证据，不声称该旧端点目前仍活跃）。
2. 本轮真实归档批量：20261004-live-archive-batch.json。配置profile03的TLS gRPC-Web入口39603/archive，完整H0匹配；23项跨两批，21处重复0x5/version1成功，索引1与21的0xdead/version1均为gRPC code5，所有成功项版本与摘要验证通过。前后覆盖读取的可用区间为0–18457（观测时点值）。请求仅GetServiceInfo与BatchGetObjects，未访问Fullnode、State或Execution。
3. 5文件54项测试通过：asset-reader、asset-hooks、nft-hooks、archive-object-reader、historical-effect，日志20261004-batch-error-state-tests.log。
4. 完整钱包类型检查通过：20261004-batch-error-state-typecheck.log。

本轮归档探测使用本地CA的Node客户端调用浏览器协议入口，没有操作Chrome，也没有完成Chrome正常证书信任／用户点击验收。RPC-19还包含checkpoint及完整归档入口合同，不随本条自动勾选。
