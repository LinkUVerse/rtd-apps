# C26 原生包类型修复与验证

当前父任务78/98，trial_ready=false。本批修复精确协议标记`package`被Move TypeTag解析器拒绝的问题；普通Move对象仍严格解析。依据[Sui官方Object协议](https://github.com/MystenLabs/sui-apis/blob/main/proto/sui/rpc/v2/object.proto)，包标记与StructTag分别处理。两套SDK契约已写入相同规则，没有放宽BCS、签名、回执或摘要验证。

产品只改变ledger-reader.ts及其测试，另外1108个文件与C25原快照一致。当前C26产品1110文件，SHA256为03a1df273de748ea3829800fcdb328da5773ea6cf0988b998518a7bc053270ea。[完整审核](./20261006-ledger-package-audit-01.json)核验原字节、当前快照、正式测试、构建、闭包与真实Chrome来源。

新增6项覆盖原生／归档完整BCS的PackageWrite正例及4种畸形标记反例；181文件2562项全量单测和完整生产类型检查通过。首轮测试夹具元数据及查询下界失败记录保留。独立production06及5277模块闭包通过；当前C26实际UI、worker和四个回环查询角色HTTP200且H0一致，零公网／旧RPC请求。上述有限检查没有验收原HTTPS信任。

实际发布05只有一次Execute：首次执行后的即时读取NOT_FOUND使该轮失败，但原回执和pending保留，随后仅按原摘要恢复，确认checkpoint1001373。铸造02只有一次Execute，确认checkpoint1002694；独立恢复和原生Display V2原BCS、owner、模板核验通过，没有重复发布或铸造。GraphQL覆盖、NFT展示和隐藏仍待，因此不据本修复勾RPC-03。

证据：[发布原摘要恢复](./20261006-display-v2-fixture-publication-recovery-01.json)、[铸造原摘要恢复](./20261006-display-v2-fixture-mint-recovery-01.json)、[原生Display核验](./20261006-display-v2-fixture-native-02.json)。C25验收及C21 ZIP/dist保持其历史范围。
