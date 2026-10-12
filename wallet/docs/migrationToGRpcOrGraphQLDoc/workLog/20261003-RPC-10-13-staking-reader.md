# RPC-10–13：当前系统与质押组合 reader（部分）

日期：2026-10-03。上轮奖励／APY算法完成是实际进展；本轮接入同S领域读取和两个展示组件，完整任务仍未勾选。

## 实现与对齐

新增staking-bcs和staking-reader，WalletAssetSnapshot.staking(owner?)／useStakingView：固定当前S读取0x5 wrapper及V1/V2内层动态字段，获取系统epoch、gas、protocol、safe mode、时间、验证者和池信息。读取inactive_validators完整表的ValidatorWrapper→Versioned UID/u64→Validator，检查pool_id；完整exchange_rates字段列表与BCS声明size一致后调用上一轮奖励／APY算法。全部StakedRtd按BCS核对UID、owner、type、principal／pool／activation，输出StakePosition／WalletValidator／WalletStakingView，保留pending、inactive和unresolved，未知不造零。无owner请求positions=null。

组合读取共20秒，active/inactive各1000、总rate10000和BCS2MiB预算。字段type／规范BCS、未来／重复epoch、声明数量、cap版本和末验错误拒绝整组；空中间页继续、全程同S，最终H0／checkpoint digest／coverage验证后交付。hook包含binding/session/snapshot/owner，不持久化；refetch失败撤下旧视图。

ValidatorLogo改用新系统视图，epoch差使用bigint且未知不当0，退役元数据可展示；DelegatedAPY使用单个同S视图，所选验证者缺一份可估算APY则显示--，不把缺值凑成0，fraction只乘100一次。

发现并纠正方案中的实际边界：官方固定Epoch源码和RTD SDL均说明Epoch.systemState是epoch开始状态，不能替代当前S可变系统对象。两套SDK合同4.1／4.4和RPC矩阵对应系统状态行已同步修正；归档原目录与14份冻结原文保持。官方文件及SHA见sui-staking-snapshot-manifest.json。

## 验证

- 新18项reader测试使用实际原生GraphQL客户端、现行RTD与固定官方SDL校验、真实BCS和动态field派生；覆盖V1/V2、active/inactive/pending/unresolved、精确金额、空中间页、size/type/version错误、末尾digest变化和取消。不是实际服务端或实链数据。
- 新1项React hook测试使用真实reader和受控context，证明查询键／无持久化和失败撤下数据；不是Chrome扩展测试。
- 实际当前debug rtd_types与bcs库解码钱包生成的V1/V2/Validator字节并原样重编码，输出选定语义字段比对；源、输入、CSV、库hash和编译日志均保存。测试冻结向量防止后续变更悄悄失去Rust对照。不启动节点、不部署合约。
- 45文件613/613定向测试通过，rpc专用类型检查通过；完整wallet仍142条诊断（前146），本批11个直接变更文件无诊断，不能称构建通过。Prettier及git diff --check通过，文档13章／14原文／21接口／22QA完整性检查通过。

初始日志保留：类型检查发现inactive APY判别值需保持字面量类型、map(normalizeRtdAddress)会把数组index传给可选布尔参数，均已修复；hook失败测试需要等待React Query异步通知后断言，修正后全套通过。evidence/20261003-staking-reader-verification.json汇总源hash和证据范围；workLog/20261003-staking-reader-*保留输出。

## 未完成

其余验证者／仓位详情／质押赎回页面仍有旧DTO和JSON-RPC，Fullnode新鲜系统输入、统一批准执行及自动恢复待接。RPC-10–13不因reader和两个组件完成而勾选。真实debug链多epoch、pool退役、safe mode、赎回及Chrome仍待指定脚本环境验收。总体13/98，尚不可试用，原目标保持完整。
