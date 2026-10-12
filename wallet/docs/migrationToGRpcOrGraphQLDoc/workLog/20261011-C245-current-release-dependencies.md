# C245：当前完整验收依赖与实时名称可用性

本轮没有把延长发布预算记成业务修复。原98仍93/98：QA-A15/17/20、REL-02/05开放。

## 当前实读

- 两次真实生产WalletNameReader均以SnapshotReadError/coverage拒绝；开始native分别为1964660、1964990，间隔78.738秒，约4.191 checkpoint/秒。四个NAME覆盖范围都为0..1006768。0目标输出、0模拟、0签名、0Execute。
- 原primary adapter正式committed元数据实际HTTP200、checkpoint_hi_inclusive=1006768；下一点1006769实际HTTP503且空body。不是已发布数据，不能强行让消费者读取。
- 六消费者63.264秒被动观测：保留三类各前进71点，约1.122 checkpoint/秒、0新增重试；主三类均未前进、新增NotFound计数164/163/163、transient均0。原观察工具因此保留passed=false，不能把“六者都推进且无重试”记成通过。结合正式边界，主消费等待新发布的解释得到支持；并不宣称持续性能已通过。
- 41条持久水位最低413926，覆盖计数413927/709570，数据进度58.3349%。consistent AvailableRange实际12686..413926，不能把水位计数写成查询服务当前可访问全部0..413926历史快照。完整数据比较/WAL/冷恢复继续等待固定范围完成。

## 权威资料与实现核对

[Sui官方客户端说明](https://sdk.mystenlabs.com/sui/clients/grpc)提供Fullnode NameService；[官方Core API](https://sdk.mystenlabs.com/sui/clients/core)将正向/默认反向名列入共享能力。[官方SuiNS集成](https://www.docs.sui.io/sui-stack/suins/developer)区分名称目标地址、名称持有者和复杂索引查询。它们不意味着RTD自定义链已配置官方名称服务。

固定官方Sui源码9948bc0d23ca89c0fe00ad7448071713ff14860d的name_service_config仅Mainnet/Testnet有配置，Unknown返回Unimplemented；当前RTD源码同样如此。固定SDK b7a61104bb41a37d88d5c06a9c172463d8eacc60 的gRPC正/反向方法调用该NameService。因此不能仅把当前GraphQL方法换成SDK同名gRPC方法，或调用Sui公网端点，就宣称解决本dev名称问题。原始源码、URL、提交和SHA见[来源manifest](../evidence/official/C245-name-feasibility-20261011-01/manifest.json)。

当前钱包显式registry的GraphQL方案保持：开始时以Fullnode头作为minimumCheckpoint，结束时最多容许快照之后新增20点。**20是读取结束时的新增高度容忍，不是允许开始时落后20点，更不是Sui协议强制常量。** 删除minimumCheckpoint或用旧快照解析结果直接签名会改变当前验收合同，本轮没有这样做。

## 后续必要条件

1. C244唯一有界观察器完成当前活跃轮次自然终态后的真实交接，C242候选完成整批正式发布；扩大预算本身不能证明批次吞吐或实时追平。
2. 正式1006768→1482841之后，还须观察下一批选择、各阶段耗时和主查询追赶速度。只完成固定1482841仍低于本轮native1964990，不能立刻勾名称正向。
3. 保留41管线继续全709569重放；当前1.122/s仅短样本，不用旧3.2/s样本承诺完成时间。可准备并验证消费提速，但实际进程接续必须和C244运行范围按顺序更新，不能相互打断。
4. 若持续发布/索引仍不能满足名称实时门槛，再形成独立的当前Fullnode显式registry点查设计与证明模型；不能把不同时间的latest对象伪装成GraphQL同S快照，不能以新路线的局部成功关闭旧必需验收。目前没有更改名称数据路线。

此依赖不需要主人补密码、权限或手工改水位。当前C241钱包余额、普通地址发送预览与其他已完成能力继续可试用；名称正向、完整回放/冷启动和全部功能最终发布验收保持未完成。

证据：20261011-C245-name-observation-01/02.json、20261011-C245-primary-publication-boundary-01.json、20261011-C245-ingestion-observation-01.json（失败范围原样保留）、20261011-C245-retained-watermarks-01.json。
