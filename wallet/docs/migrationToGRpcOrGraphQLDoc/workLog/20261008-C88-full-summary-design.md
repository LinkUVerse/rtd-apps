# C88：完整 checkpoint summary 外层审核

目的：补齐C85只校验三u64与contents digest前缀的明确限制，完整十三对象／五cap／三账户及原六交易合同保持。生产源码／旧qualified工具和源码pins不改，新独立decoder及auditor版本单独留证，仍用qualified C85完整positive采集器。

权威依据：[Sui固定源码](https://github.com/MystenLabs/sui/blob/712c7263297c01fce764e8f99c17150c9b8120f6/crates/sui-types/src/messages_checkpoint.rs)和[当前RTD对齐证明](./20261008-C88-summary-source-authority-01.json)。CheckpointSummary外层十字段布局固定；previous和end_of_epoch_data是option，Gas四u64、timestamp_ms、两commitment变体、96字节committee key和u64 weight/protocol必须规范解码。version_specific_data保留opaque Vec<u8>，逐字节与protobuf比对；没有protocol config不能宣称解释内部payload。完整外层解析不代表重新验证quorum证书，后者依既有RTD debug认证。

- S88-1：封存固定官方及当前RTD／SDK源，类型布局对齐；实施前Task与workLog合同保存。
- S88-2：新full外层BCS schema，parse后原样重新序列化，typed digest和所有protobuf字段逐项对齐，包括完整ordered commitments与可选epoch委员会／protocol。保留C85所有历史／objects／contents函数。
- S88-3：两个实际历史完整checkpoint与故意篡改protobuf／追加或截断BCS拒绝；明确展示旧prefix工具遗漏字段的限定红灯。构造epoch／两commitment和高u64 fixture只认证decoder分支，不冒充实际epoch/quorum。
- S88-4：完整原帧auditor新版本仅将parser换为追加fullSummary的C88，其余13／5／3／原六与源／guard合同完整保持；独立source delta、原51合同及新decoder资格审核。
- S88-5：七覆盖门达到524022后，实际执行原C85全scope positive并由C88独立完整审核，再推进页面与父项。未执行正向或浏览器不记通过。

原发布7463／17722自然推进，无额外签名、Execute、faucet、合约、容器、CA或原profile操作。本次只读原帧解码资格不接受当前未提交尾部，不改变84/98。
