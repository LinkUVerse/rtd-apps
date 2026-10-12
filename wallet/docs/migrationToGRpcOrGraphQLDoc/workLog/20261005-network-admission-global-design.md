# CAP6实施前细化：可信配置、全局负面隔离与旧值撤除

本设计承接[NC5／CAP6总设计](./20261005-network-capabilities-aggregate-design.md)、[当前接入审计](./20261005-network-admission-global-pre-audit.md)与原Task F1–4。编码前保存实际涉及文件原字节；以下全为待实施，不先勾选或生成用户可试用声明。

## F1可信配置与能力状态

F1a：把既有四族报告转换为core可消费的只读状态投影，保持core不反向依赖wallet。configured／hasFullnodeSession原语义不升级成ready；定义validating、read-contracts-assessed及具体degraded／quarantined。各族未配置、partial／syncing、缺独立声明与service build／revision未签认明确保留，显示当前可读范围；不得将同响应SHA或本地profile revision冒作服务部署证明。

F1b：单独可信发布pin输入注册表，来源是受控发布配置；不从链响应／profile自动计算并回填自身可信pin，不接受UI随意指定可信hash。不存在权威发布条目时继续unreviewed，不阻止独立余额事实核验。内置环境保持完整reviewed profile，legacy URL与SDK默认Sui入口禁止推导；自定义网络权限审核保持已有受控流程。

F1c：Provider按本次binding／session执行NC5，结果和错误不能跨session／回切继承；各业务reader仍执行自身新鲜H0／事实合同，聚合只读状态不成为交易授权。接入必须保持慢资产集合调度与余额／metadata／staking独立快照，不把任何domain的S自动移交其它domain。

F1d：后台在实际内部／dApp批准链使用同一可信配置与负面门槛，不把UI报告视为后台授权。普通Fullnode同链操作可在其它族暂不可用时显式降级；已知canonical错链停止本binding的新操作，原字节签名／模拟／执行的各次授权边界继续新鲜核验。

## F2负面状态与持久合同

F2a：明确分类，canonical NetworkIdentityError错链与结构不兼容是身份负面；schema／ABI明确不兼容按相关族记录；HTTP503、timeout、partial、coverage同步不足、未配置／缺审核声明不能伪造已知错链。先制定精确versioned record／binding作用域和read-only重检接口，所有输入canonical／预算／只允许公开role/reason，不存账户、tx、payload或secret。

F2b：负面落盘只在strict transaction complete后算持久完成，缺API／abort／corrupt／升级失败明确拒绝；正面普通探测不能洗掉负面。保留旧记录，只有受控revision／generation重新绑定按其精确作用域允许重新审核。现有高度reset仍按H0／generation处理，不能只加revision绕过它。

F2c：当前会话发现负面立即关闭旧reader／signal，跨UI／worker负面消息必须重新读取持久状态，不凭任意广播数据直接授权。每次新操作及发布前按实际持久合同重检，storage失败停止新的授权／发布。广播是撤值通知，不把Web Locks／本地缓存当分布式服务fencing证书。

F2d：只读旧摘要／journal恢复保持原scope与独立H0证明，不删除、改写或重提交原pending；此例外不得成为新交易的签名／模拟／Execute路径。明确审计恢复调用链，不把全局准入混入journal数据库升级。

## F3撤值与范围

F3a：失败／会话切换撤去旧聚合状态、asset snapshot／proof及相关reader，关联QueryClient按准确wallet binding／session取消和移除，不能误删其它网络或非链业务缓存。回到相同profile必须新session，禁止从缓存恢复能力正例。

F3b：检查余额、资产、metadata、Kiosk、账户历史、名称、staking／索引及receipt的Hook／UI展示；isError、隔离、disabled和重查不同状态均不得将旧value冒作当前事实或空集合。补齐history-hooks等已证实缺口，保留真实空页与partial差异；不把历史事实用作交易输入。

F3c：沿用wallet-* save／hydrate禁持久化及mutation禁止，已存损坏／旧来源过滤继续；账号切换与同binding新session的UI本地选择／偏好不得授权旧reader或恢复旧模拟。

## F4验证与交付

F4a：纯合同、可信注册表、schema／ABI负面分类及普通成功不能解隔离的单测；每次fixture和当前来源分别记录，不冒作独立真实发布签认。

F4b：实际React／query cache与后台内部／dApp入口；旧成功后当前partial／H0错链／会话关闭／返回相同profile、负面并发提交和storage失败均撤值，余额独立于Display失败仍可读取。旧journal恢复与新交易分支分开证明。

F4c：真实Chromium持久存储／多context和权限状态证明，随后当前源码稳定Local构建与新Chrome核心回归；原journal与交易根只读保护，正常CA门槛不能用忽略TLS的浏览器替代。没有完整真实发布pin、可选部署及服务build／revision签认时不得提升为整个网络ready。

F4d：全量／类型与双方文档、source provenance、Task／workLog／totalProgress按真实范围更新。需要dev仍只用最新RTD debug及link-u-smart-contract脚本，不restart受保护回放。未获独立环境验证的项目保持开放；父49/98、trial_ready=false。

## F1a–b编码前选定合同

先保留[共享Context原字节](../evidence/20261005-network-admission-view-before/manifest.json)及[当前状态](./20261005-current-state-before-network-admission-view.md)。core新增纯状态类型，Context新增可选readCapabilities，不反向依赖wallet或改变configured／hasFullnodeSession语义；wallet投影仅本binding／cacheKey下新鲜聚合状态，复制并deep freeze状态，不携带client、交易／账户payload或授权布尔，也不以同一个checkpoint冒作跨域S。Native逐method正例、GraphQL各领域snapshot、Move ABI／部署pin与账户coverage-only／owner范围各保留自己的状态；未审核部署或任何partial／未配置不能被投影升级为ready。

独立发布registry只由受控调用方配置注入，其存在不等于独立部署权威已实际具备。version1 exact JSON schema，整体UTF8至多1MiB／16绑定，entry exact profileBindingKey／json／trustedSha256；绑定key UTF8至多16KiB、json至多64KiB、SHA固定64小写hex、去重，精确compact重编码拒绝重复key／其它数字或转义拼写。只选完全匹配当前networkBindingKey的声明，复用verifyReviewedDeployment验证独立预设pin及全部包／名称锚合同；不计算新的pin写入registry，不回退其它网络／revision条目，无IO或SDK默认入口。空注册表／无当前binding为unreviewed，格式／budget／trust／declaration等明确rejected；冻结结果，无来源原文／消息／账户payload输出。正常配置缺权威条目保持未审核；实际可信发布签认仍是后续环境门槛。

F1a–b只建立状态及受控选择接口，Provider／后台与Webpack发布输入接入归F1c–d，持久负面／全局撤值仍归F2／F3；新增模块未使用前不能称全局门槛已实施。先单测用真实NC5四族协议结果并反例核验，随后全量／类型与双方日志范围收口。

## F1a–b本批收口及接入依赖

F1a–b已编码并通过75个新增场景／四文件153项、完整157文件2151项和类型／格式；仅完成纯状态投影与受控发布registry接口，Provider／后台尚未接入，quarantined视图不等于持久门槛。原配置／Fullnode会话语义保持，未具备真实发布权威。先落实F2a–b精确负面合同／strict独立存储，再接入F1c–d／F2c–d并实施F3；Task细项按此依赖顺序排列，父49/98和trial_ready=false保持。全部来源／原字节／首次失败和有限范围见[本批日志](./20261005-network-admission-view.md)。

## F2a本批收口与F2b必需门槛

纯分类／观察占位合同已编码，61新项／2212完整回归与类型／格式通过；[详细范围和首次失败](./20261005-network-admission-state.md)及[编码前F2设计](./20261005-network-admission-state-design.md)保留。先strict提交占位后开始观察，后续完成须原对象ticket所有权／首个决定锁定，失败后不能补造正面删掉占位；这些原生存储保证归F2b，尚未实施，F1c–d／F2c–d实际接入仍等待它。W3C strict提示与真实事务／物理断电证明分别表述；高度reset及原摘要恢复不被纯合同替代。

## F2b本批收口与实际接入依赖

独立strict存储／原对象观察所有权／首次决定锁定／单总期限已按[F2b设计](./20261005-network-admission-store-design.md)编码，13新项／2225完整回归／三套类型及26原生事务／并发／正常重启验证通过，详见[完整日志](./20261005-network-admission-store.md)。此前“F2b尚未实施”属于F2a批次历史状态，当前F2b.1–2已完成有限范围；尚未把它接入Provider或后台，仍必须落实F1c–d／F2c–d／F3及核心Chrome。不能把合成观察IO次序叫全钱包IO已门禁，也不能把正常重启叫物理断电。

## F2c.1默认后台门槛有限收口

按[本轮设计](./20261005-network-admission-authorization-design.md)连接现有真实身份守卫与native默认存储，19新项／2244全量／三套类型／14原生有限验证通过，详见[工作日志](./20261005-network-admission-authorization.md)。三角色占位提交后IO，已存第四角色身份Fault也阻止但不伪造第四bookend，未settle取消留pending，已知负面等待时关闭也先落盘，正常完成失败不重试空决定。F2c.2／F1c–d／F3／F2d仍必需，读记录与最终授权竞争不因本项完成消失；共享session的领域独立撤值和只读原journal恢复保持具体后续门槛。

## F2c.2a／F3实际Provider负面读取有限收口

实际Provider持久负面消费／IO前后native重检、精确query撤值与多数读Hook遮蔽已按[本轮设计](./20261005-network-admission-provider-design.md)编码，41新项／2285全量／178定向／三套类型／13原生有限验证见[完整日志](./20261005-network-admission-provider.md)。此前Provider尚未接入的描述是前批历史状态。普通读没有新造观察ticket或H0／能力正例；NC5完整聚合／可信发布输入、四角色／领域观察协调、最终授权竞争、全部批准UI与原journal恢复例外、当前扩展／正常CA核心Chrome继续。原父49/98与trial_ready=false保持。

## F1c／F2c.2b本轮有限落地

[先存设计及日志](./20261005-network-admission-observation.md)覆盖当前Provider独立NC5、受控编译输入、原ticket提交顺序与物理在途取消保留。165文件2317项、32新增及6独立编译通过有限边界；当前SDK＋native协调、F1d后台ABI、最终授权竞争与新扩展真实核心Chrome继续待，父49/98不变。

## F1d后台固定交易依赖下一实施顺序

当前SDK＋native原ticket协调已补10项实际有限证据，见[本轮日志](./20261005-network-capability-observation-native.md)。F1d后续以[实际只读审计](./20261005-background-move-admission-pre-audit.md)及[细粒度设计](./20261005-background-move-admission-design.md)为序；builtin独立命令与MoveCall ABI、coordinator新操作与原record只读返回不能混淆。当前未实施F1d业务门槛，所有待验收继续开放。

## F1d本轮有限实现收口

上述F1d尚待属于只读审计批次历史状态；当前固定批准依赖、default后台original-ticket观察、内部／dApp新操作边界及owner／native末检已按[本轮日志](./20261005-background-move-admission.md)完成有限编码，41新增／2358全量及14native通过。最终原子窗口、真实发布pin／服务签认、完整批准／原journal只读反例及当前扩展／实链继续开放。
