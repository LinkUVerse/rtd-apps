# CAP6 F2a：有限负面分类与观察占位纯状态合同

按[F2a–b实施前设计](./20261005-network-admission-state-design.md)推进；先保存[七份前置来源](./20261005-network-admission-state-pre-audit-01.json)及[更新前状态](./20261005-current-state-before-network-admission-state.md)，此前64来源逐字不变。本批完成F2a.1–3的纯状态／分类与有限协议验证；F2b真实strict存储、原ticket所有权／完成决定、Provider／后台门槛及缓存撤值仍待。49/98（50.0%），trial_ready=false。

## F2a.1精确状态与单调转换

[状态模块](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/shared/rpc/network-admission-state.ts)定义四角色identity、八GraphQL domain与十二Move group，Fault仅identity的chain-mismatch／incompatible、domain的schema与group的abi。根仅schemaVersion1、完整bindingKey、faults、pending。binding UTF8≤64KiB、整个normalized JSON≤128KiB；≤28种Fault、≤32个ticket，每ticket精确小写UUIDv4／非空≤24种areas，拒绝未知／额外字段、非法枚举、跨binding、重复ticket／area／Fault与非canonical顺序，复制后deep freeze，不冻结原输入。

reserve先生成本area的观察占位；complete基于事务当前值、原ticket及相同areas，合并负面并只移除自己的占位。不同ticket重复同area的存储值拒绝；并发其它schema／ABI或identity负面不能被旧观察的正面完成擦掉。identity负面／占位影响整个绑定，domain／group只影响请求声明的依赖；Display／assets检查中或已有schema／ABI负面时，独立balances检查不被阻止。

无清除、TTL、删除或普通正面覆盖Fault接口；空记录／此检查未拒绝均不生成ready或新交易授权。revision／generation新绑定不修改原记录，受控重绑实际授权仍归接入层；原高度reset按H0／generation，revision不会改变其scope。纯reserve／complete必须在F2b事务内部读取当前行后使用，本模块不声称内存snapshot可以阻止并发存储覆盖。

观察前占位是发现负面后写入失败的前置保护：后续先strict提交占位，再开始IO；负面完成写失败时留住占位，后来新实例不能补造正面将它清掉。原观察对象所有权、首个完成决定锁定、失败后不能改成正面重试及真实transaction complete由F2b实现，本纯模块尚未提供这些原生存储保证。只读原摘要／journal恢复例外也未接入，不把负面检查与旧交易库升级混合。

## F2a.2生产错误与报告分类

[分类模块](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/shared/rpc/network-admission-classification.ts)只接受真正的本地NetworkIdentityError实例；不解析name、message、任意error data或UI状态。实际生产identity探测对canonical异链和非法H0的错误分别分类，保留四角色公开原因。

报告先经过本live session的F1投影合同；只提取完整报告中的domain unsupported/schema及Move group unsupported/abi。当前报告绑定、内层proof、H0或session错误仍拒绝，不拿别人的成功做分类。未审核部署、pin-mismatch、缺包／依赖、unsupported template／kiosk-package、预算、partial、syncing、HTTP503及未配置均不伪造为这三种已知负面。

不兼容／不完整SDL响应未取得完整有效schema声明时，生产聚合保持incomplete/response并拒绝当前报告正例；分类器不冒称已取得某domain的unsupported声明。它不会生成可用值或解除已有负面。实际接入仍需依此报告状态拒绝当前失败，不能把“本分类无确定Fault”当当前schema可用；明确领域合同不匹配的有效SDL则产生对应schema Fault。

## F2a.3有限验证与首次失败

[最终检查](./20261005-network-admission-state-checks-final-01.json)保存实际工具退出码与日志SHA：

| 检查 | 实际结果 | 证据 |
| --- | --- | --- |
| 新状态／分类场景 | 38＋23＝61项 | 两个新test文件 |
| 状态／分类／视图／聚合定向 | 4文件120项全部通过，exit0 | [targeted02](./20261005-network-admission-state-targeted-02.log) |
| 最终当前源码完整钱包 | 159文件2212项全部通过，exit0，59.45秒 | [full-wallet01](./20261005-network-admission-state-full-wallet-01.log) |
| RPC含core类型 | exit0，无诊断 | [rpc02](./20261005-network-admission-state-types-rpc-02.log) |
| 完整钱包类型 | exit0，无诊断 | [wallet02](./20261005-network-admission-state-types-wallet-02.log) |
| 四份新增文件格式 | exit0 | [format01](./20261005-network-admission-state-format-check-01.log) |

正例／负例沿实际SDK gRPC、BCS、RTD SDL与生产四族聚合，不用mock整份报告：有效SDL缺Balance.addressBalance产生balances schema负面、coinMetadata仍保留独立快照；Coin descriptor字段不同产生coins ABI负面；实际identity H0失败产生明确身份Fault。partial、503、不兼容SDL、缺可选配置以及其它状态分别验证不被伪造为已确认ABI／领域负面。并发较晚identity负面与其它领域schema／ABI保留、关闭／不同session及预算／canonical均有反例。

[首轮](./20261005-network-admission-state-tests-01.log)55/56，唯一失败是新夹具删去Address实现IAddressable必需的balances字段，使整个SDL不合法；生产schema断言拒绝，分类为空，不能当有效领域schema不匹配证据。已保存[首次夹具原字节](../evidence/20261005-network-admission-state-diagnostics/manifest.json)，改用完整有效Balance字段反例，并保留原非法SDL作为独立“不伪造已确认领域负面”测试。首轮RPC类型实际0，未放宽生产合同、预算或worker数量来通过。

格式02曾返回运行中handle；随后确认工具实际退出0，最终完整159文件轮次在格式结束后运行。没有把“已启动格式工具”当成格式已完成；本批最终源字节按清单固定，未在完整回归中继续编辑业务代码。

## 来源与标准边界

[当前来源](./20261005-network-admission-state-source-inventory-01.json)：此前64份不变，加四份本批模块／测试＝68份；没有修改任何旧生产源码，历次20份原字节保持。另保存一份新测试中间版本，仅诊断，不把它当旧生产来源或当前源码证明。当前产品1060文件SHA `8271ce76843464af4fbe52edcbf7c071103baabce1de2e934b48333b61d7bd4d`。此前1056产品及C9只是历史阶段；旧C9磁盘摘要不变，本批未构建新扩展。

W3C IndexedDB 3.0固定2025-08-13版本为Working Draft，其strict属于durability hint；钱包后续策略是请求strict、检查属性、等待transaction complete。该策略与纯状态测试都不能证明设备物理断电持久性。[原文](https://www.w3.org/TR/2025/WD-IndexedDB-3-20250813/#transaction-durability-hint)及[官方HTML／七份前置源码SHA](../evidence/official/20261005-network-admission-state/manifest.json)保留；原14份Sui／GraphQL权威原文和59份本地链／SDK源码不变，新W3C来源只支持浏览器存储合同。本批没有新增Sui协议裁决。

## 文档收口与后续必需

双方网络章同步本合同及未实施范围，Task只将F2a.1–3记为纯合同／有限协议通过，F2b.1–2与F1c–d／F2c–d／F3／F4保持待实施。精确[验证器](./20261005-network-admission-state-document-verifier-01.py.txt)及[文档来源结果](./20261005-network-admission-state-document-verification-final-01.json)核验链接、共同段、前后源码、原字节、固定标准和真实范围；父任务计数及totalProgress仍49/98、trial_ready=false。

本批没有创建或操作实际新准入IDB、读取／改写journal、实链请求／模拟／签名／Execute、新Chrome或服务启动；不修改RTD／只读SDK、genesis、原交易根或受保护PID66145。需要dev时继续遵守最新RTD debug与指定合约仓库脚本；目前不需要调整环境。

下一步F2b必须真实落地独立strict事务、原ticket所有权／完成决定、单5000ms预算、abort／升级／迟到／store失败；再把观察前占位及当前负面重检接入Provider／后台所有新操作与发布边界。普通成功／重启不能洗掉负面或失败占位，但原摘要只读恢复必须保留原scope。F3撤值、正常CA、新产物／核心Chrome、实际独立发布pin与所有原接口／交易验收仍必需。
