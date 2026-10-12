# NET-04 NC3C：部署声明与名称 registry 实施前设计

承接[全钱包目录](./20261005-move-contract-catalog.md)，[编码前状态](./20261005-current-state-before-deployment-contract.md)原字节保存。当前审核 profile revision2 仅配置 OriginByte，名称／PK／原生Kiosk缺失；先实现合同，不生成运行时自签认，不部署或提交额外交易。父49/98、trial_ready=false继续。

| 子项 | 编码前状态 | 交付 |
| --- | --- | --- |
| C1 | 待实施 | 独立发布审核 SHA-256 钉住的 canonical JSON声明；精确 profileBindingKey含H0／generation／revision／端点与部署，全部唯一package的storage／original／version／完整BCS与模块bytes；缺失、改绑、未审核、预算明确拒绝 |
| C2 | 待实施 | 唯一来源审核 suins-v1 Registry 与 RegistryKey，根 shared身份／initial version、确定性动态字段ID／owner／type／canonical BCS及嵌入双Table UID；前后根／字段稳定引用，不调用不存在Table对象作为正例 |
| C3 | 待实施 | 独立原文与故障反例、完整binary SDK／共享leaf／单总期限／2MiB／取消迟到 fence、只读harness和实际当前配置报告，双方同步日志和来源；没有审核声明不能记实链部署签认 |

[三官方固定源码及四当前RTD摘要](../evidence/official/20261005-deployment-contract/manifest.json)确认 Registry 是 store结构，内含 Table<Domain,NameRecord> 与 Table<address,Domain>，通过 suins::RegistryKey<Registry> 挂在 SuiNS 根对象。Table UID是嵌入handle，非独立顶层对象。当前Move compiler给空 RegistryKey补dummy_field:bool，Pack插入LdFalse，因此键BCS为单字节0；不使用空bytes或mainnet默认registry。仅支持该已审核布局；其他名称合约部署必须另审，不凭字符串module推断兼容。根对象仅核验共享身份／类型与完整对象一致性，不解读其余额、管理权限或执行语义。

声明由独立可信发布配置提供trustedSha256；未提供声明返回unreviewed，hash来自同一HTTP响应／观察报告不建立权威性。声明严格64KiB、compact JSON重编码逐字相同（拒绝重复key／未知字段）、包／模块去重及完全覆盖当前配置。版本canonical正u64，digest／地址／SHA严格，copy+freeze防入参改写。完整BCS pin覆盖全部包bytes；descriptor仍来源于B3稳定关联，升级original只能表述与审核声明一致，非独立bytecode反编译证明。

C探测每次重新取得B3包／ABI结果，不接受旧缓存报告；整体单30秒期限（1–60000ms），独立stage共享同一signal。只允许Fullnode GetServiceInfo／GetObject／GetPackage三方法、POST精确URL、credentials omit与redirect error；2MiB含trailer、叶请求占位至完成。名称字段额外GetPackage核对与本轮已关联descriptor SHA一致并精确比对两新datatype；root／field前后引用一致，H0及checkpoint／可读下界包围。只有声明pin、包ABI和可选名称锚均匹配才声明reviewed-deployment-matched；不发布全局client或ready，不自动模拟／签名／Execute。NC4–6／CAP6及可选业务／原父余项仍必需。

所有首次失败保留；本批不修改只读SDK／RTD，不restart／resume受保护回放，不操作交易保留根，不沿用旧C9为新构建／Chrome证据。
