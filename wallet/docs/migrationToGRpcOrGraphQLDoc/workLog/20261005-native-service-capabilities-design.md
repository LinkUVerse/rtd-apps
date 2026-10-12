# NET-04 CAP5 NC3A：原生只读方法正例实施前设计

依据[NC1–NC6设计](./20261005-network-capabilities-design.md)顺序推进；NC1／NC2已封存，NC3完整合同仍待。主合同为[网络握手2.2](../06-网络缓存分页与插件边界.md)。[固定Sui源码](../evidence/official/20261005-native-service-capabilities/manifest.json)与当前只读SDK／RTD源码已核对：GetServiceInfo只包含完整H0、epoch／水位／server，没有完整服务能力列表；GetPackage区分storageId／originalId，GetFunction返回独立descriptor。不能把server字符串、SDK方法存在或某请求NOT_FOUND当部署签认、协议版本或方法正例。

| 子项 | 编码前状态 | 范围与验证 |
| --- | --- | --- |
| NC3A | 待实施 | Fullnode六个明确只读方法及Archive两个Ledger方法，使用已存在系统对象／同水位检查点／原生Coin；真实binary SDK、H0前后包围、预算／取消／迟到、各方法明确失败与只读真实探测 |
| NC3B | 后续必需 | 同链packages的storage／original／version／bytecode关联，当前reader用到的datatype布局／函数完整ABI；不从运行时生成宽松期望、不填默认部署ID |
| NC3C | 后续必需 | name正反registry存在／类型／所有权／BCS、独立声明版本／部署签认与当前配置revision；完整NC3及执行能力不由A替代 |

## NC3A具体协议与边界

Fullnode只调用Ledger.GetServiceInfo／GetCheckpoint／GetObject、State.GetCoinInfo、MovePackage.GetDatatype／GetFunction。Archive只调用Ledger.GetServiceInfo／GetCheckpoint，不向受限归档发送State、模拟或执行。临时SDK client每次新建，MVR空URL，严格实际URL／POST白名单、redirect:error、credentials:omit。六方法positive只意味着本轮该方法按所列正例可读；ListOwnedObjects／Name／其他方法未探测，不能声称同service全量通过。GetDatatype UID／GetFunction object::id仅检查规范且非空descriptor身份及基础格式，完整布局／参数ABI仍归NC3B；不冒称合约兼容。

每角色先完整H0和必需最低／最高u64，再选本轮可读的最低checkpoint并校验sequence／digest；若最低为0则digest必须精确H0。Fullnode用GetObject(0x2)复用decodeFreshObject核对完整BCS／引用与Immutable package正例，State以固定0x2::rtd::RTD及明确metadata证明正例，非空UID／id descriptor证明独立方法可读。全部方法settled后重新GetServiceInfo，H0变化／高度倒退／最低变化／选择器出界均拒绝整个角色，已知错链优先整体失败。流水线coverage和snapshot不由native height互代，不写持久观察或旧成功缓存。

默认30秒共享总期限，1–60000ms显式边界；每leaf用现有session.request占读取名额，每响应至多2MiB，完整body＋trailers结算前名额不释放。caller取消／session关闭能及时结束等待，底层忽略abort时迟到不发表。失败为unsupported(UNIMPLEMENTED)、missing-positive(NOT_FOUND或正例未找到)、incompatible(响应不合法)、budget、unavailable；不打印原错误、payload、账户或签名。所有正例仅冻结摘要／选择器／版本与public SHA，报告deployment not-verified、nonReadMethods not-probed、packageRegistryCompatibility not-verified，绝无ready／signer／client。真实probe CLI只表明评估完成，allProbedMethodsVerified必须独立看负项。

本批不会重启受保护回放、重建genesis、重新部署合约或触碰原交易journal；当前C9仍历史产物，新构建／Chrome随NC6完成。完整钱包单测与类型、实际正例负项、来源／双方合同／任务日志与进度分别保存；父49/98、trial_ready=false保持。
