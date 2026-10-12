## 2026-10-05: 本地外部附加服务边界与C12验证

## 2026-10-05：C13期限修复完成，实链只签名通过；环境当前退出

[本轮日志](./20261005-probe-deadline.md)：九个读取路径释放已完成操作的期限计时器，保留真实取消／物理未结束阻断；360定向、170文件2382完整回归、类型与稳定构建通过。实际fresh当前UI／worker一致，四入口同H0、有限启动外部0／pending0；真实只签名3模拟、固定BCS／预览digest／Intent验签通过，0Execute。原失败和旧pending保留。随后四服务端口无监听、PID66145退出且Docker暂不可连接；02惰性原journal核验RpcError失败，环境恢复需核查实际终态，未称试用可用。50/98、trial_ready=false。


按照[实施前设计](./20261005-local-external-services-design.md)完成编译开关、后台feature三入口、Analytics初始化／URL／退出、Sentry边界。默认关闭，production且显式WALLET_EXTERNAL_SERVICES=true才开启；空feature沿用原默认值，不替代网络／交易权威。八份[原字节](../evidence/20261005-local-external-services-before/manifest.json)保留。

[本轮日志](./20261005-local-external-services.md)：C12 fresh启动UI／worker实际匹配、四入口同H0、有限启动外部0与pending0；2379完整测试／类型／构建通过。随后只签名准备失败、0模拟／广播，保留profile native pending1。旧超时信号缺陷已用1失败2通过复现，修复后360定向／类型通过，新working源码完整回归与构建正在进行，未称实链修复通过。50/98、trial_ready=false；旧pending及正常CA不解除。

## 2026-10-05: 瞬时窗口被动能力观察修复与C11实际只签名

按[实施前设计](./20261005-transient-capability-observation-design.md)完成P1–P4有限范围：持续页面独立观察，精确dApp连接／批准路由及toolbar popup不自动启动完整被动NC5，明确unavailable/policy，不复用正报告。owned session／native负面订阅、所有reader合同与后台固定BCS依赖门槛保持。旧pending、已知Fault及取消未知状态不删除，不使用TTL或空complete。

两个C10失败profile及C11成功profile均保留，私有恢复密码仅权限0600文件。正常CA三个HTTPS失败仍待，精确SPKI不代替CA。持续页面首轮未知原因、旧票据安全恢复、真实发布签认、最终原子授权、完整Move与全试用继续。有限子任务不新增父完成：50/98、trial_ready=false。

本批汇总见[检查](./20261005-transient-capability-observation-checks-final-01.json)。


## 2026-10-05：NET-10消费者构建完成，当前C10真实签名仍失败待修

NET-10按[实际范围](./20261005-consumer-analytics.md)完成，50/98、trial_ready=false。统计无能力明确不可用、38全部Explorer／完整生产构建／core类型及闭网startup通过；钱包1076产品字节保持。新C10真实四入口精确三证书只读及default native pending0／fault0通过，normal CA三个HTTPS失败；7条原journal实时effects保持、0模拟／广播。只签名两次失败保留（一次3模拟等待20秒，另一次0模拟准备失败），两保留profile均既有native pending1／fault0，无删行／修复。下一步复现短生命周期批准窗口完整NC5被取消导致pending的具体机制，再修scope／复验；不凭猜测扩大授权。受保护PID66145连续0–339255／339256 marker、原22水位不变，through386503未完，不resume。

## 2026-10-05：后台固定交易依赖门槛编码与有限验证完成

F1d后台固定BCS依赖与门槛已完成本轮有限编码：精确作者target与闭包，builtin不伪ABI／自定义类型opaque，默认native原ticket先落盘再SDK、物理未完成不空complete；目标ABI及package pin按依赖政策，Display等无关负面不伤独立目标。内部及dApp execute在原record／pending只读分支后激活，sign-only排除pending后激活；probe前后账户／profile／权限独立重核，最后native目标重读。缺pin保留unreviewed，UI报告不授权，最终原子窗口仍开放。41新项／167文件2358完整／164定向、类型／格式及14原生58夹具请求通过，0外部／实链／模拟／签名／Execute；6原字节／7诊断与133映射、1076产品精确重建保持。F1d真实发布pin、服务签认、完整批准／恢复反例、四入口normal CA及当前扩展核心Chrome仍待，父49/98、trial_ready=false；未重启／resume受保护回放或操作原journal。
见[本轮日志](./20261005-background-move-admission.md)及[检查](./20261005-background-move-admission-checks-final-01.json)。以下保留各批历史边界，不提升当前扩展／真实链验收。

## 2026-10-05：后台审核部署与交易依赖只读审计完成

后台只读审计核对25份当前实现／SDK输入，122项既有来源和1072项产品字节保持，尚未实施F1d业务门槛。实际authorize只有身份参数，固定内部bytes／dApp注册表批准字节应作为后续交易依赖输入；coordinator原record／pending只读返回、内部signing=false与dApp readOnly恢复须保留。官方PTB命令／SDK参考及固定transaction.proto确认builtin与MoveCall独立，不得把概念签名当成Move函数ABI，或按整包ID把无关阅读ABI负面投射到全部交易。后续按精确target＋作者目录依赖、原ticket／物理settle协调、目标政策与末检、内部／dApp新操作边界、恢复反例依次实施；未审核用户函数／类型保持opaque，缺声明不伪造错链／ABI负面。真实发布pin／服务部署及执行语义仍未签认，最终原子竞争／完整批准／正常CA和当前扩展核心Chrome未通过；49/98、trial_ready=false。
见[审计](./20261005-background-move-admission-pre-audit.md)与[实施前设计](./20261005-background-move-admission-design.md)。下文为各自历史范围。

## 2026-10-05：当前SDK与原生观察协调补充验证通过

仅新增隔离harness／执行器，生产120份来源与1072项产品字节不变。真实生产观察协调／SDK／native strict IDB／WebLocks用合成Fullnode协议完成10项，48次夹具请求，0浏览器错误／外部／实链／模拟／签名／Execute；default库确认错链、多context pending拒绝、取消迟到不空complete、put成功后abort只尝试一次且保留原pending、错误checkpoint与在途兄弟竞争保存负面、四种状态正常浏览器重启后仍拒绝。GraphQL／Archive／Account未配置，空pending不授权；不作为四入口、物理掉电或当前扩展验收。F1d后台审核ABI／真实发布pin、最终竞争／批准UI／原摘要只读恢复、正常CA与核心Chrome仍待，49/98、trial_ready=false。
见[本轮日志](./20261005-network-capability-observation-native.md)及[检查](./20261005-network-capability-observation-native-checks-final-01.json)。下文保留原批次范围，未执行项不被历史结果覆盖。

## 2026-10-05：当前会话NC5／原ticket协调已完成本轮有限验证

165文件2317全量、32新增、187定向功能、三套类型／12来源格式及6真实common编译边界实际0；[完整日志](./20261005-network-admission-observation.md)及[检查](./20261005-network-admission-observation-checks-final-01.json)。Provider当前session独立观察已接、原ticket正常完整完成后释放、在途取消不空完成、负面视图不残留正面字段，恢复storage不复活旧NC5。真实SDK/schema/BCS＋React使用memory控制流，当前SDK＋native协调和扩展核心链未执行，F1d后台审核ABI／真实发布pin／最终竞争／批准及journal恢复边界继续。49/98，trial_ready=false；未重启RTD／回放或部署，PID66145保护，无新bundle。以下保持历史证据及原待办，不提升为当前验收。

## 当前事实与下一步


**最新：Provider持久负面读取／精确查询撤值已完成有限编码验证。** 本批41新项、163文件2285完整、18文件178定向、13 native Chromium多context／正常重启，RPC／钱包／harness三套类型与37来源格式实际0。已知identity关闭旧会话，Display／schema／ABI按依赖隔离，独立余额保留自己的S；history／receipt当前error、disabled资产／staking撤旧值。先前43全量失败及类型／旧键断言已保留并修复；30原字节和整个产品原状态哈希重建证实其它产品源码／配置／SDK保持。未构建新扩展／运行真实Chrome或dev，F1c–d NC5／可信发布输入、原ticket协调、最终授权竞争、全部批准UI与原journal只读例外仍待。父49/98、trial_ready=false。见[本批日志](./20261005-network-admission-provider.md)。

以下各批历史验证仍按各自范围保留，不自动升级成当前完整试用证明。

任务计数以Task.md为准：49/98（50.0%），trial_ready=false。此页仅汇总最新已验证事实；此前354行完整保存于[本次整合前状态](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261004-current-state-before-query-recovery.md)，更早阶段仍保留各自日志。历史PID、构建摘要、余额和水位不能当作当前事实。

**NET-04 CAP6 F2c.1真实后台身份授权本批已接持久门槛。** 现有守卫默认native准入库，三角色strict占位后开始SDK、原高度提交／自身完成／末检后才返回；已存accountHistory身份负面全binding拒绝但不伪造第四bookend。已知Fault先本session停止再落盘，关闭不掩盖；正常complete失败不空决定重试，未settle取消留pending，迟到正面不解锁；旧H0／generation reset及revision不能绕过，生产只读原摘要恢复分支未改。19新项、77定向／完整161文件2244、三套类型／格式0；14原生默认守卫／两个native store、跨页／worker／浏览器正常重启及abort／取消通过，33公开SDK帧调用、0外部／实链／模拟／签名／Execute。首轮DOMException夹具失败profile／日志／字节保留，spy清理避免串扰。72前批源码保持＋七本批＝79，三份旧源码加原20＝23保留原字节；1063产品SHA5f046fc5748c55f343eed976a398752381cbfc24d56d1e075cf14e3bd40ee88b，历史C9不变、无新build或dev／原journal／回放操作。观察协调／跨context撤值后重读、Provider NC5／registry、schema／ABI依赖、准确cache／UI旧值撤除、原摘要恢复反例及最终授权竞争／核心Chrome继续，49/98、trial_ready=false。见[本批日志](./20261005-network-admission-authorization.md)、[设计](./20261005-network-admission-authorization-design.md)与[原状态](./20261005-current-state-before-network-admission-authorization.md)。

**NET-04 CAP6 F2b独立strict准入存储本批编码与原生有限验证完成。** 先事务提交pending后返回原ticket，完成仅原对象／原binding／首个有效决定；失败负面不能改空，事务内单调合并且不清除其它Fault／pending，identity全binding、schema／ABI按依赖，Display不阻止balances。一个1–5000ms总期限覆盖open／事务、strict属性／complete、即时失败与迟到关闭／拒绝；精确独立库／行，不复用journal。13新项／74定向、完整160文件2225及RPC／钱包／harness三套类型、格式实际0；26原生Chromium项及事件／外部请求0，跨页／worker和浏览器正常重启保持。首轮complete监听器次序夹具失败、原profile／日志／脚本字节保留；不作物理断电或真实扩展验收。68旧来源不变＋四新＝72，1062产品文件SHA3cef7c74a37c4358bb8f43914777ed476c7fb6303e307fac49fbd545b34695a7；20既有原字节及两批各一新诊断保留，历史C9不变、无实链／原journal／回放操作或新build。F1c–d／F2c–d／F3实际门槛、最终发布／跨context重读、cache撤值和只读旧摘要恢复继续，49/98、trial_ready=false。见[完整日志](./20261005-network-admission-store.md)、[实施前设计](./20261005-network-admission-store-design.md)和[更新前状态](./20261005-current-state-before-network-admission-store.md)。

**CAP6编码前实际接入审计（历史批次）。** 12份来源SHA及全部72份F2b当前来源不变；后台三角色identity与独立accountHistory合同、signing与旧摘要恢复分支、Provider共同session／各领域独立及history旧data缺口已定位。审计当时F2c.1尚待，现本项已完成上文有限接入；仍继续协调Provider／跨context及按依赖撤值。此段只记录当时审计，不以它代替当前代码／运行证据。见[实际接入审计](./20261005-network-admission-runtime-pre-audit.md)及[更新前状态](./20261005-current-state-before-network-admission-runtime.md)。

**NET-04 CAP6 F2a纯负面分类／观察占位本批编码与有限验证完成。** 三类有限Fault、精确version1 binding／faults／pending、观察占位与当前值单调合并，不清除其它负面／占位；identity影响整个binding，schema／ABI按依赖领域，Display失败不阻止独立balances。实际SDK／SDL的有效schema字段缺失及Coin ABI不同产生明确分类；partial／HTTP503／缺部署签认等不伪造已知负面，不兼容SDL当前失败也不冒称有效domain声明。38＋23＝61新项、四文件120／完整159文件2212全部通过，RPC／钱包类型和格式实际0；首轮interface SDL夹具55/56失败及原字节保留。旧64来源不变＋四新份＝68，20份旧原字节另有一份新诊断；1060文件产品SHA8271ce76843464af4fbe52edcbf7c071103baabce1de2e934b48333b61d7bd4d。W3C固定Working Draft确认strict为提示，纯状态不作native IDB／物理断电证明；F2b strict占位提交、原观察对象所有权／首次决定、5000ms总预算与浏览器多实例／重启仍待，Provider／后台接入与全局撤值未实施，无本批实链／journal／服务或新bundle／Chrome操作。49/98、trial_ready=false。见[完整日志](./20261005-network-admission-state.md)、[细化设计](./20261005-network-admission-state-design.md)及[更新前状态](./20261005-current-state-before-network-admission-state.md)。

**NET-04 CAP6 F1a–b只读状态／独立发布registry上一批编码与有限验证完成。** core仅纯类型／可选字段，configured／hasFullnodeSession不升级为网络ready；投影本session根／四族与schema／Move／domain proof、三角色前后H0，封闭状态复制深冻结，不输出客户端／账户／交易payload。精确受控version1 registry≤1MiB／16条，只选完整binding及既有独立预置pin，不生成或回填可信pin；实际发布权威仍缺，夹具pin不代替签认。新增75项，四文件153／完整157文件2151全部通过，RPC／钱包类型及格式实际0；首次10条readonly夹具／5条泛型诊断及package-id反例夹具失败全部保留。57份NC5来源不变＋七份当前来源＝64，20份原字节；1056文件产品SHA c61beb5851e73eb5874d2174d26b2097886395e2448ad376d0f6eeac883222cb。没有本批实链请求、Provider／后台接入、持久隔离／全局撤值、新产物或Chrome；旧C9只是历史产物，49/98、trial_ready=false。F1c–d依赖F2a–b先完成；原高度reset与journal恢复边界保持。见[完整日志](./20261005-network-admission-view.md)及[更新前状态](./20261005-current-state-before-network-admission-view.md)。

**NET-04 NC5四入口有限能力聚合本批完成。** 复用四族、前后身份、60000ms单总期限／白名单／2MiB／四SDK leaf等真实cleanup；修复身份与两族已知错链被held掩盖。新增44项，244定向／155文件2076当前全量及完整钱包／RPC／八脚本类型通过；保留2074/2076初次全量故障，G4a仅修复窗口次序夹具，生产交易未改。真实owner02默认预算内22720ms／53请求、5条事实及末验通过；owner01上游不可用、assets incomplete、names未配置及部署unreviewed保持，全集认证false。11本批／57唯一当前来源、46先前保持与3明确替换、5本批原字节，1051产品来源SHA 6851d506a20d639572c3c0fbdc2168387da2212368864f399679912d1bb2a569；SDK／RTD只读，磁盘仍历史C9、无新build／Chrome。最新debug、原回放0–206816／206817 marker与22水位保持，0模拟／签名／Execute；CAP6全局旧值撤除／持久负面隔离、NC6当前产物与原业务余项继续，父49/98、trial_ready=false。见[本批完整工作](./20261005-network-capabilities-aggregate.md)、[设计](./20261005-network-capabilities-aggregate-design.md)、[原状态](./20261005-current-state-before-network-capabilities-aggregate.md)。 [双方与来源核验](./20261005-network-capabilities-aggregate-document-verification-final-01.json)40文档／75共享H2、57当前／19原字节、14官方／59本地及三仓diff实际通过。

**CAP6已按接入审计细化F1–4，尚未编码。** Provider尚未调用聚合，后台WeakMap负面不会跨新session保存，既有strict NetworkObservations只证明height reset；历史Hook旧值隐藏亦需补齐。[17当前来源](./20261005-network-admission-global-pre-audit-source-01.json)、[审计](./20261005-network-admission-global-pre-audit.md)与[设计](./20261005-network-admission-global-design.md)先保存，再按Task编码。没有CAP6／当前bundle／Chrome通过声明，NC5 1051产品／57当前来源保持，父49/98及trial_ready=false。

**NET-04 NC4账户合同与真实包事实修复完成本批有限验证。** 唯一两根协议、六原生依赖、2MiB streaming／单期限／四leaf取消cleanup，保留全分页／原六旗标／opaque cursor及所有BCS事实；服务错误白名单拒绝partial，修正package仅与权威V2 PackageWrite对应。新增91项、147定向／153文件2032全量（仅测试worker减至2，生产预算不变）及钱包／RPC／七脚本类型实际0；默认并发全量一次2031/2032旧名称夹具时序超时和枚举类型／初次spy／body错误全部保留。真实同账户完整5条、176712–288451、六次HTTP200与末验分别在能力30秒及生产默认20秒通过，0模拟／签名／Execute；registrationComplete与两全集旗标false，限定三项true，allAccountHistoryVerified=false。9当前＋40原能力源码保持、7本批原字节、3官方／15本地摘要，1046产品来源冻结；磁盘仍C9、未新build／Chrome。回放0–199423／199424 markers、原22水位、最新源及8 debug通过，PID运行无终态，不restart／resume或操作交易根，D5保持。NC5完整聚合／CAP6全局撤值、NC6当前产物、真实独立发布声明／可选部署／服务签认与原六接口／全部试用余项继续，49/98、trial_ready=false。见[本批日志](./20261005-account-history-capabilities.md)、[设计](./20261005-account-history-capabilities-design.md)、[此前状态](./20261005-current-state-before-account-history-capabilities.md)。 [NC4双方与来源收口01](./20261005-account-history-capabilities-document-verification-01.json)37文档、74共享H2、49当前／14保留字节、12官方／54本地及六诊断harness通过，规范13／14／22／21与三仓diff通过。

**NET-04 NC3C Move声明／名称锚编码与有限验证完成。** 独立可信发布SHA、精确查询binding含profile revision、全部包BCS／版本／模块pin，严格64KiB／canonical／去重／freeze；suins-v1共享根＋确定性RegistryKey字段与嵌入双Table UID合同，未知布局拒绝，不GetObject Table作为正例。单总期限／2MiB／全trailer／四native共享名额、取消迟到与结束错链优先。新增67／151文件1941及钱包／六脚本类型实际0；真实14只读全部200／四包九领域ABI兼容，但独立声明missing／名称unconfigured，state=unreviewed、reviewedDeploymentMatched=false，0模拟／签名／Execute。report显式仅Move范围，服务build／运行revision／签认和执行语义not-verified；本地revision pin不能冒充服务签认。全部类型首失败与1940/1941四vs六夹具错误保留修正，旧35源码保持＋5新、3官方／4本地摘要一致，1042来源冻结，磁盘仍C9，未新build／Chrome。受保护回放0–185901／185902 markers、原22水位与8最新debug验证，PID运行无终态，未restart／resume／操作交易根，D5调查保持。C4–5实际声明／可选部署／服务签认、NC4–6／CAP6与全部原父余项仍必需，49/98、trial_ready=false。见[本批日志](./20261005-deployment-contract.md)、[实施设计](./20261005-deployment-contract-design.md)与[此前状态](./20261005-current-state-before-deployment-contract.md)。 [双方与来源末验02](./20261005-deployment-contract-document-verification-02.json)35文档／73共享H2、40当前／7旧源码及9官方／39本地摘要通过；收口脚本两次定位／父ID规则误差失败均保留修正。

**NET-04 NC3B B3全钱包固定合同目录编码与有限验证完成。** 来源审核Std／Coin／系统质押／reader依赖／动态字段／Display键及名称ABI，完整泛型／abilities／顺序／reference；每个类型引用闭包、同名冲突与整个产品AST八显式MoveCall守卫。全配置50布局／8函数，当前46／6、用户payload opaque与协议SDK envelope分开；149文件1874项（新增52）、钱包与五能力脚本类型实际0，真实四包14只读／九配置领域全部兼容，0模拟／签名／Execute。Kiosk／PK／names未配置不作实链业务通过；SuiNS235与当前RTD200语法差异明确保留，registry／revision／部署及执行语义仍未验。首轮123/125＋副本导入／循环预算／PK状态失败已修正并保留，7旧源码原字节与11当前来源、前17＋7及6官方／38本地摘要一致；1038产品来源已冻结，磁盘仍C9、未新构建／Chrome。受保护回放0–179191／179192 markers、原22水位与最新8 debug保持、PID运行无终态；未restart／resume或操作原交易根，D5旧拒绝仍调查。下一NC3C–6／CAP6及所有原余项仍必需，49/98、trial_ready=false。见[本批日志](./20261005-move-contract-catalog.md)、[编码前设计](./20261005-move-contract-catalog-design.md)及[此前状态](./20261005-current-state-before-move-contract-catalog.md)。 双方72共享段落、33文档／链接、35当前与7保留源码及权威摘要末验通过。

**NET-04 CAP5 NC3B B1／B2所选合同编码与有限验证完成。** Kiosk／PersonalKiosk／OriginByte及基础依赖的来源审核完整布局／函数模板、严格shape比较、实际包BCS／descriptor／typeOrigin与前后稳定引用关联；一个总期限／2MiB／共享leaf、逐包去重、预算与不兼容明确分类及传递依赖撤值。148文件1822项（新增74）、完整钱包与五能力脚本类型实际0；真实8只读请求，两包68／3模块关联及framework／OriginByte所选完整ABI通过，未配置Kiosk／PersonalKiosk／name不计实链通过，0模拟／签名／Execute。catalog partial，升级original仅service-declaration、registry／部署／执行语义未验，B3全钱包闭包、NC3C–6与CAP6仍必需。7本批来源、前17＋7及一官方／13本地摘要一致，1034产品来源已冻结；磁盘bundle仍历史C9，未新构建／Chrome。受保护回放0–173235／173236 markers、原22水位保持、最新源码与8 debug验证、PID运行无终态；未restart／resume或操作原交易根，D5旧拒绝调查保持。父49/98、trial_ready=false。见[实施日志](./20261005-move-package-capabilities.md)、[实施前设计](./20261005-move-package-capabilities-design.md)及[此前状态](./20261005-current-state-before-move-package-capabilities.md)。 双方71共享段落、31文档／本地链接、31唯一来源及官方／本地摘要末验通过。

**NET-04 CAP5 NC3A只读正例有限合同完成。** 六Fullnode／二Archive明确方法，binary SDK／精确URL白名单、完整BCS系统包／nativeCoin／UID和id基础descriptor，H0与必需水位前后包围、真实最低checkpoint；默认30秒总期限／2MiB／共享leaf名额、取消与迟到、已知错链优先及全部trailer。146文件1748项（新增36）、完整钱包及四能力脚本类型实际0；真实同H0十只读请求、所列八正例通过，0模拟／签名／Execute。部署签认、其他方法和完整ABI／registry均未验证，NC3B／C、NC4–6和CAP6继续；首轮84/86与类型／预算包装问题的失败修正保留。7本批来源、原NC1／NC2的17文件、1028产品来源及三官方原文摘要通过，磁盘bundle仍历史C9、未新构建／Chrome。受保护回放0–166142／166143 markers，原22水位保持、最新源码与8 debug验证、PID运行无终态；未restart／resume或操作交易保留根，D5旧拒绝仍调查。父49/98、trial_ready=false；资产与名称原负项不因native正例解除。见[实施日志](./20261005-native-service-capabilities.md)、[实施前设计](./20261005-native-service-capabilities-design.md)及[此前状态](./20261005-current-state-before-native-service-capabilities.md)。 双方70共享段落、29文档／本地链接、24唯一来源及合并原文检查通过。

**NET-04 CAP5 NC1／NC2编码与有限验证完成。** 十一明示GraphQL查询合同复用真实reader字段并核验H0／schema／nullable／input／enum／union／oneOf及默认literal；八领域独立coverage／pin／Display准入，一个总期限、错链优先及取消／迟到fence。145文件1712项（新增52项）、最新完整钱包／三个脚本类型实际0、当前SDL基准检查通过。真实入口末验14只读请求、十一合同兼容，六领域S288451声明快照通过，assets仍partial、names仍未配置，allDomainsVerified=false；0模拟／签名／Execute。强启用服务不支持deprecated-input自省造成02 partial失败已保留，实际metadata查明oneOf支持／InputValue扩展缺失，最终明确inputValueDeprecation not-requested，oneOf仍必核验。前code设计、全部夹具／生成／类型失败均保留，未修改只读SDK或RTD源码。当前工作区是本批新源码；运行安装包仍为上一稳定C9，未构建／安装本批新产物或做新Chrome，不沿用旧通过。最新受保护历史连续0–160183／160184 markers，原22水位不变、最新源码和8 debug验证、PID运行无终态，不restart／resume；原交易保留根未操作。NC3服务正例／package／registry、NC4账户历史、NC5完整聚合及CAP6全局状态／缓存撤值、NC6新产物核心Chrome与全部原父余项仍必需。49/98、trial_ready=false。见[本批日志](./20261005-network-capabilities.md)、[实施前设计](./20261005-network-capabilities-design.md)及[此前状态](./20261005-current-state-before-network-capabilities.md)。 来源17项／1026产品文件与四官方原文摘要、三仓diff、27文档及69共享段落末验通过；磁盘双bundle仍等于历史C9，未新构建。

**上一稳定C9：NET-04持久原生水位与跨操作准入本批有限合同完成。** 独立严格schema／H0-generation观察、双角色水位、开始快照与串行事务重验、真正倒退strict complete隔离及后台每次authorize接入。123定向／143文件1660全量、钱包／RPC／core类型检查及16项Chromium原生存储／窗口／worker／全浏览器重启夹具通过；后者0链请求／签名／提交，不冒充实链或物理断电。新1019源码稳定2c1cc18d、Local UI3a40822e／后台c9e3780e、AST／四入口闭包通过。Chrome03当前worker启动／重启逐字一致，正常签名摘要／Intent验签，实际归档正水位后受控0隔离、新操作零身份／模拟拒绝、整浏览器重启有效已批准bytes零transport拒绝及readonly空恢复／journal保持通过；5模拟0Execute，74条真实三角色身份响应均200／同H0。首轮01通过与02未定位布尔断言失败均保留，02原profile只读隔离／空journal／锁定通过，失败不覆盖。最终原7及新增四attempt新worker／原摘要／bytes／签名／effects只读通过，逻辑SHA逐项等于AUTH、0模拟0重发；比较01 wrapper KeyError及所有旧worker切换失败保留。最后回放0–141019／141020 markers、原22水位保持、最新源码与8 debug严格验证，PID66145及supervisor59830仍活跃无终态，无restart／resume，D5拒绝调查保持。双方DTO／缓存／编号差异及新网络／执行合同同步，27文档／722链接／68共享段落及来源摘要末验通过；三仓diff及6脚本语法实际0，合法行号与错脚本路径检查失败均保留。CAP5／6完整capability／全局负面身份及UI、六接口／全业务批准／正常CA／锁定整轮及完整试用仍必需。49/98、trial_ready=false。见[完整日志](./20261005-network-observations.md)与[此前状态](./20261005-current-state-before-network-observations.md)。

**历史稳定N签名等待8组与提交后三类完整通过，锁定缺口保持。** 产品N未变，1016源码／6f9dd283、UI502b1fa0／后台64061534。实际软件签名完成后暂扣交付，sign／execute×四事件8组27模拟0Execute、18同BCS正式模拟、0返回签名／journal变化、原方法与拦截恢复、当前worker和锁定重启通过；批准前8组03亦完整6模拟0Execute通过。提交后切网／切账户／caller取消三个独立场景各3模拟1Execute整轮通过，真实200／grpc-status0成功response已接收后暂扣、原请求中止／无dApp结果、完整原pending保持；还原审核Local／原账户后锁定重启只查各自原摘要，原Intent签名／BCS／链effects吻合，无重发。初始lock另有实际一笔CCNYbcx的响应／pending及独立终态复核，整轮清理失败、首次模拟帧未持久化及第一次恢复锁态断言失败仍保留，不能称四类完整矩阵通过。最终只读审核确认原7逻辑SHA与N相同，新增4原绑定／3 stores／原生签名和effects终态、审核前后不变均通过，0模拟0提交；最新历史严格0–122625／122626 markers、原22水位不变、原PID66145运行无终态，未重启／提前resume，D5此前拒绝调查保持。正常CA、全capability／内部业务批准／NFT／活跃仓位及完整试用仍待；49/98、trial_ready=false。见[本批工作日志](./20261005-sign-dispatch-lifecycle.md)及[续验前状态](./20261005-current-state-before-post-dispatch-continuation.md)。

**前一产品构建：后台交易三入口身份授权守卫有限验证完成。** 每个后台交易授权新查已配置入口H0，已知错链／不兼容拒绝、Fullnode有效而其它入口暂不可用仅身份降级，本session已观察高度倒退持续隔离；等待后账户／配置再次复核，只读原摘要恢复保留权限。新增24项，139定向／142文件1618全量及双方tsc通过；1016源码稳定Local UI502b1f／background640615、AST／四入口闭包和公开TLS7组通过；原两profile7journal／effects及逻辑SHA保持。Chrome01–04定位失败原始证据保留，05当前worker启动／重启逐字匹配、固定BCS批准摘要及验签通过；三组错链在准备前或健康预览后签名批准处拒绝，无返回签名／journal变化，整体5次checks启用模拟0Execute；实际三角色身份均H0一致，明确两份精确SPKI例外，未宣称正常CA；正常CA／完整网络capability与全业务批准仍待。历史只读0–99940／99941 markers、原22水位保持、原有界PID运行无终态；先前D5拒绝调查保持。49/98、trial_ready=false。见[本批日志](./20261005-background-network-identity.md)及[更新前状态](./20261005-current-state-before-background-network-identity.md)。

**前一产物：独立完整余额与精确币预览有限验证完成。** 页面余额仅依赖consistent，保留固定S全分页／末验／精确u128／owner及20秒总期限，完整资产原proof保持；失败撤值、切会话及NFT隔离已验证，确认增加wallet-balances失效但不冒充写后读追平。新增33用例，96定向／141文件1594全量、core4及双方tsc通过。当前1014份稳定源码SHA7a71e4，Local UI189c8c／backgroundd58de2及AST／四入口闭包通过；公开TLS S288451一页一币完整余额999998855320原子RTD、末验成功，完整Display资产仍拒绝。实际当前Chrome UI／worker逐字一致，首页999.99 RTD与ActiveCoinsCard在Display失败后可用；1.000000001精确转1000000001原子单位并完整显示，模拟BCS目标／金额／sender与本地摘要匹配批准页，4模拟0Execute，最终批准未点，原两journal不变／锁定。原两profile7journal及effects只读保持，与前批logicalSHA一致。两次旧Chrome失败和两批旧产物保留；历史只读本批0–89840／89841 markers、原22水位不变、PID运行无终态，D5此前拒绝调查保持。父49/98、trial_ready=false；非原生／发送全部、完整NFT／活跃仓位／正常CA与全试用待。见[本批完整日志](./20261005-balance-domain.md)和[更新前状态](./20261005-current-state-before-balance-domain.md)。

**此前产物：质押金额转换与正式预览有限验证完成。** 沿用metadata批同一1009源码Local UIe55ab5／backgroundd58de2；actual UI／worker逐字一致、公开metadata S288451，1.000000001 RTD准确转1000000001原子单位。两次Fullnode Simulate均checks启用，末BCS的sender／validator／质押调用／金额和SDK digest与真实预览一致，最终批准可用但未点击；2模拟0Execute、0签名、返回／锁定及原两journal不变。无新回执，不把旧indexed epoch／空仓位当当前奖励；完整资产、非原生表单／发送全部、活跃仓位／赎回和正常CA仍待，49/98、trial_ready=false。见[当前预览日志](./20261005-staking-current-preview.md)。

**此前产物：Coin metadata独立快照与实际金额表单有限验证完成。** 两项GraphQL依赖、整体20秒和完整末验，完整资产内部proof保持；Provider／core hook独立于NFT key，自失败撤下精度／proof，gc0不persist。66定向、138文件1561全量、core4及双方tsc通过；公开TLS S288451链上decimals9、missing type明确null、完整资产仍拒绝，共9请求HTTP200。1009稳定源码Local UIe55ab5／backgroundd58de2及AST／闭包通过；真实Chrome当前UI／worker逐字一致，列表／选择／Display失败后保持／表单9位输入通过、10位拒绝，未点预览／批准、0模拟0Execute。原两profile7journal／effects、逻辑SHA与前批一致，已锁定。旧worker失败和trace最初错误字段均保留，重新采集确认实际S288451。最新历史连续0–83684／83685 markers、原22水位不变、PID66145运行无终态，之前一致性拒绝调查门槛保持。49/98、trial_ready=false；下一优先实际质押预览和剩余接口。见[本批完整日志](./20261005-coin-metadata-domain.md)。

**此前批次：可选Display管线准入及Chrome有限验证完成。** 当前新增hist_displays触发旧精确22行403／503已受控修复；22必需＋显式可选仍严格校验，11新／7部署／10旧测试和实际RR/TLS五投影拒绝通过。仅owned监听器11462→82796，32／8／32预算保持。公开16请求HTTP200，质押S288425／epoch2完整3汇率和空仓位、S100 Display能力通过，S85345及完整资产拒绝。选择改用质押proof key，24定向／1534全量／tsc、稳定1006源码Local UI0636b5／backgroundf2628c通过。真实Chrome当前UI／worker逐字一致，列表／选择／真实Display失败后保持／表单跳转通过；metadata仍依赖完整资产并显示同步错误，原两条journal不变、已锁定、0模拟0广播。07:04:38原回放0–79696／79697 markers、原22水位不变、PID运行无终态；此前一次marker／watermark状态拒绝保留，后续单次一致不消除D5故障调查。49/98、trial_ready=false；接下来独立metadata查询。见[本批日志](./20261005-query-optional-pipeline.md)。

**此前产物：质押独立BCS领域快照编码与有限验证完成。** 新reader按实际六项依赖读取全部池／汇率／owner仓位，Provider及core hook独立于NFT assetSnapshotKey；完整NFT Display准入保持。58项定向、钱包136文件1531项、core4项及双方完整tsc通过，1006份源码稳定Local／双入口AST／四入口39方法通过；当前UI b24b8f、background f2628c（后台字节与前批相同），原7条journal／effects只读一致，当前只签名3模拟0Execute通过。显式native入口生产reader在S282633、epoch2完整读取3汇率、13请求，原账户该S为空；公开入口授权连接超时503，cp300333原质押尚晚于此S，非空活跃奖励／大规模汇率／完整质押赎回UI仍待。06:43:28原有界回放连续0–70187／70188 markers，原22水位不变、PID66145运行、boundedExitCode=null；没有重启或提前恢复。S1–S5见[本批日志](./20261005-staking-domain.md)，此前状态见[备份](./20261005-current-state-before-staking-domain.md)。父RPC-11／13开放，49/98、trial_ready=false。

**历史批次：跨会话／窗口读取并发预算有限实测。** 同一上下文所有session共用4申请／64等待，同扩展bucket页面和worker共享4原生锁读取名额；取消不提前释放忽略abort的底层操作。新增9项，钱包134文件1495项、完整tsc、Chromium6组／32次合成读取、1001份稳定源码Local构建／双入口AST／四入口39方法闭包通过；UI61c89f／backgroundf2628c。原7条journal及原生effects只读不变，当前worker逐字一致，0模拟0广播；当前只签名3模拟0Execute通过；批准前8组授权4模拟0Execute通过。历史最新06:25:41连续0–63732／63733 markers、原22水位不变、原PID66145运行、无终态。完整服务故障／取消传播、资产／正常CA和内币／NFT／stake完整批准仍待，NET-11开放，49/98、trial_ready=false。见[本批日志](./20261005-cross-context-read-budget.md)，此前状态保存于[备份](./20261005-current-state-before-cross-context-read-budget.md)。

**此前Explorer现代Kit消费与当批钱包产物联检已完成有限范围。** Explorer79→7实际诊断，24新合同／全部32单测、新消费范围typecheck、core4项及完整tsc、钱包1486项及完整tsc通过；analytics服务缺口仍阻断完整Explorer构建，NET-10开放。共享lock变化后稳定999份源码SHA740cdd，Local UI bd5293／background58e0e1，双入口AST／四入口39方法闭包通过；实际当前worker与新background逐字相同，原5＋2终态journal／effects只读核验和前批逻辑SHA相同、pending0、0模拟0广播。两次Chrome旧worker reload失败保留；新bytes Fullnode-only只签名3模拟0广播、同返回BCS／预览digest／Intent验签通过，批准前8组授权矩阵8模拟0广播通过；内币／NFT／stake完整批准、提交后切换、实际签名函数等待锁定、资产和正常CA仍待，前批50b804结果不直接沿用。06:05:05历史连续0–55171／55172 markers，原22水位不变、PID66145运行，无终态；49/98、trial_ready=false。见[本批日志](./20261005-consumer-kit.md)；更新前状态保留于[备份](./20261005-current-state-before-consumer-kit.md)。

**当前归档桥接四组合查询与固定Envoy协议实测已补齐。** 实际当前manifest／镜像／只读挂载及持久重启策略核对，最新8个RTD debug仍匹配来源；固定Envoy合成mTLS上游17项及renderer6项通过，增加binary stream／text unary／超时预算保持。原同链TLS入口4组合、8只读请求通过，有限5笔原生帧／末status及摘要点查一致，0模拟0签名0广播。E1–E3完成有限范围，E4完整预算／取消／持久化故障仍待，ENV-05／06开放，49/98、trial_ready=false。见[协议实测日志](./20261005-query-protocol.md)。 05:31:28最新历史实际0–41065／41066 markers，原22水位不变、原PID66145仍运行，无终态；未恢复live。

**本轮前Local扩展的Fullnode批准／只签名及批准前授权有限复测已通过。** 当批999份源码与构建SHA d330ab一致，实际worker与background 50b804逐字相同。原dApp5条／staking2条journal终态、实时原生effects、scope、无pending及逻辑内容前后不变均通过，0模拟0广播。最新真实只签名的两次正式模拟与返回BCS SHA一致、checks启用、SDK Intent验签与批准digest一致，3模拟0广播；8组批准前授权／模拟等待复测4模拟0广播通过。正常CA、完整资产和提交后切换／签名执行等待锁定仍未验收。C1–C4有限合同已完成；TX-01／TX-10继续开放，49/98、trial_ready=false。05:18:22历史连续0–34606／34607 markers，原22水位不变、原PID66145运行、无终态退出码。见[当前产物实测](./20261005-current-extension-authorization.md)。

**TX-01批准字节审计与赞助边界补测试已推进。** B1–B4完成：官方文档／固定源码与本地必需签名者规则核对，新增7项覆盖单签execute拒绝、赞助sign-only及正式模拟proto与BCS的5字段不一致。16文件336定向、133文件1486全量、完整tsc、当前源码稳定Local构建／双入口AST及四入口39方法闭包通过；UI 9f390e／background 50b804字节保持，当批构建源码SHA d330ab。B5／父TX-01仍待完整范围；当批产物Fullnode及批准前有限Chrome见对应历史记录，49/98、trial_ready=false。05:04:56历史实际0–29278、29279 markers，原22水位不变、PID66145运行、无终态退出码。见[本批调用链与证据](./20261005-final-bytes-authorization-audit.md)。

**TX-12故障合同已完成，终态隔离写入缺口已修复。** 五次授权边界、异步取消、批准输入TOCTOU、请求身份冲突及恢复撤权新增16项；实际Chromium pending／终态事务abort、损坏与升级、跨窗口／worker共27场景通过，其中9项新增。133文件1479单测、68定向、完整tsc、Local构建／双入口AST／四入口39方法闭包及8审计测试通过。commitReceipt在同一终态事务内重新核验隔离标记，失败保留原pending和scope；失败复现日志保留。49/98、trial_ready=false；本批0dev链交易。见[完整故障合同](./20261005-execution-fault-matrix-completion.md)和[最终机器证据](../evidence/20261005-execution-fault-matrix-completion.json)。

**本轮前Local产物的构建证据已由实际Fullnode／批准前Chrome复測补充。** UI 9f390efd6a74ec0fcda3981e2080b1d656d4fd48868c7f50f318b35faf652d40、background 50b80436c3dfb99b40096b8bf1268a99873e23986ae3f3d70d63d662267ace5b保持，原D4及上一轮dist均保留；源文件999项重新核对相同。05:07时“尚无新产物Chrome证据”的原状态完整保存于[更新前状态](./20261005-current-state-before-current-extension.md)。当批真实有限证据见对应历史记录，完整资产、正常CA及完整试用仍待。

**D5／D6吞吐改造已实际部署。** 独立前缀辅助表用原checkpoint外键、前驱外键和行内算术约束证明连续性及精确SUM；431328原行逐行SHA及chain全状态保持，实时catalog末验和固定版本／源副本校验保持。26真实PG（含12组守卫差分）、镜像24／主机32／部署7项通过；候选原生读与实际mTLS终验通过。守卫镜像cbc2a7受控切换，首次监听URLError保留，后续仅只读终验，adapter／消费者未重启。12次固定SHA读取中位0.486→0.302秒；04:34:54历史连续15581／15582 marker，5次连续观察约8.7 checkpoint/s，原22水位不变、原PID66145运行、上界386503，无终态。48/98、trial_ready=false。见[辅助索引日志](./20261005-publication-prefix-index.md)。

**D5／D6已完成最新debug受控安装，认证历史回放正在运行。** 八目标和三个publication helper同源码构建成功，当前索引器66项及D4 Reader38／GraphQL249项通过。仅CLI／indexer／GraphQL三个artifact改变，原文件／配置／genesis／数据库／journal完整保留；4个字节相同消费者、adapter和publisher未重启。一度在退出身份过渡中止，确认旧PID全消失且未复制／启动后，单独停止恢复完成，未重复发信号。最新主机来源守卫接受实际产物，三个历史表与各3项触发器安装，22条旧管线保留。核心35590已通过原链487696→487767及三笔回执／余额一致证明并ready=true。回放PID66145从0推进、上界386503；当时2026-10-05 04:16只读TLS观察连续0–9440／9441 marker、原22水位不变，coverage与watermark一致，尚无终态退出码，未恢复全部live管线或新版Chrome。48/98、trial_ready=false。见[部署与回放日志](./20261005-display-debug-deployment-and-replay.md)。 发布器03:56曾心跳超时，04:16当前健康且新验证子进程运行；两次观察分别保留。回放期间实际native S100能力和生产钱包解析器通过、未覆盖S拒绝；账户三个helper同源码debug构建且默认文件字节相同。完整tsc及53项运维／回放守卫通过。这些有限能力验证不等于共同资产窗口或新版Chrome通过。

**D4历史Display能力与钱包basis准入已完成本批编码和回归。** Reader38项、GraphQL249项均在同一当前RTD源码通过，两个sourceUnchanged=true；钱包133文件1463项（新增45项）、完整tsc、显式Local开发构建／双入口AST及四入口39方法静态闭包通过。sourceId／历史generation与固定S摘要在pin／read／末验中核对，非空模板basis强制校验；D4新增4项实际PG函数。该批D4仅证明编码；后续D6最新服务已安装、认证回放已启动但尚未完成，新版Chrome仍未验收；48/98、trial_ready=false保持。详见[本批日志](./20261005-display-history-admission.md)和[最终整合证据](../evidence/20261005-display-history-admission-completion.json)。旧状态完整保存于[更新前状态](./20261005-current-state-before-display-admission.md)。

**此前D4扩展产物仅完成静态构建，Chrome旧结果对应之前的c446dd／05b4e2产物。** 该批D4 UI c017238ba4057f1efcd5d7b77352bbab7adeb43e111a38bf9468a77f37d016b7，background 95f84aaece018f0f4ac8aebe0b411d7a7db42cb0a958934fdf80b6964b7b9ea6；旧dist已完整保存。新产物要求历史能力及basis合同，实际资产页面待D6部署后验证，不能沿用旧Chrome有限通过结果。八个运行debug文件现在已与当前源码的隔离构建证明逐项相同；部署与恢复有独立操作记录。新扩展仍未在Chrome验收。



**此前核心 CLI 已受控切换为当时指定源码的 debug 产物，PID21240、当次runtime.ready=true。** 原生438627→438698、15.042秒，三笔原成功回执／余额与切换前一致、0模拟0广播。原四份YAML／genesis／数据库／journal保持，消费者未随核心重启；33项切换／恢复守卫通过。当次核心切换是历史事实；D2–D4后当前源码已在本轮完成八个debug构建及受控安装，核心最新PID35590。钱包trial_ready仍为false。见[受控切换与实际证明](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261005-core-debug-current.md)。

**此前共同资产窗口恢复，生产资产字段读取通过；本机监听队列缺陷已修复，完整OriginByte单次只读回归通过，入口仍有残余超时。** SQL生产七键7.114ms／32页和3项真实PG回归已完成。单次等待已结束，生产reader实际接纳S176808，13对象五组字段通过；早先公开display与第二账户OriginByte下游503已定位到授权建连。默认队列5仅24/32次/live成功；现队列32、PID11462，同测32/32及扩展256/256成功，三种合法授权204、unknown403，5项守卫通过。公开／原生固定S display复测通过；OriginByte两账户完整生产读取S182969／123请求及两条未签名路由通过、0模拟0广播。Chrome此前资产阶段超时实际0条GraphQL请求，已定位原UI／后台缺审核Local配置，与Docker授权建连超时分开记录。已按profile03重建及双入口AST验证；另复现并修复切网清缓存后存储迁移就绪检查不恢复导致页面空白。14定向、132文件1418项、tsc和开发构建通过；当前Chrome在S189657的余额、10非视觉对象／链接、Kiosk空详情及密码／锁定／整浏览器重启通过，0模拟0广播。Docker入口仍有授权建连超时。队列修复仅证明本机突发缺陷消除，持续稳定性待对照定位，不记父RPC通过。D1权威Display历史语义已对齐，D2历史索引已编码并通过本批测试；历史读取D3已编码并通过36项Reader／247项GraphQL库回归；D4本批准入编码与回归已完成，认证回放／D5–D6待推进，见[本批日志](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261005-current-assets-window.md)。

### 资产窗口与最新页面结果

原dev链及退出的服务已沿用同一genesis／数据库，通过指定合约仓库脚本恢复。此前生产WalletAssetReader在S151755读取原账户13对象；此前S143051／S143205核验记录保留；账户历史reader接纳142656–143193的有限窗口、0笔交易，registrationComplete及全集活动／收支认证仍为false。此前读取失败、consistent重启下界和KV桶重放导致的不可读窗口全部保留，见[受控恢复](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261004-runtime-cold-recovery.md)。

后台20秒轮换资产快照会取消尚未完成的慢集合读取；已通过真实Provider／SDK三页测试复现并修复。当前同binding／session的资产查询完成后才恢复自动轮换，切generation仍立即取消旧读取。真实Chrome重新通过10个非视觉对象与链接、Kiosk卡片及空详情、账户密码／锁定／整浏览器重启，0模拟0广播。见[轮换修复](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261004-snapshot-rotation.md)。

此前定向Chrome元数据读取在S145612明确返回WMIG metadata=null，发送页显示精度缺失说明且不存在金额／批准入口；不把未知decimals当0，不把旧S的缺失当成当前链上余额归零。S仍早于WMIG种子400826和钱包发送409864，metadata、PersonalKiosk及写后读尚未追平。见[元数据状态](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261004-token-metadata-state.md)。

此前只读OriginByte复核在S154734因20秒集合预算超时，17次GraphQL请求后失败，未进入新鲜对象比对，0模拟／0广播；[失败证据与范围](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261004-checkpoint-interval.md)已保留，该失败保留；本批OriginByte两账户123请求已通过，非空Kiosk的Chrome页面仍未验收。

这些Chrome场景采用真实headless扩展、compiled Local配置及精确开发证书SPKI例外；正常CA、自定义host权限、直接NFT display／隐藏、非空Kiosk及转出没有在本批验收。

### 最新代码和产物

共享预览已由旧serialize()改为现代getData()同步快照，FundsWithdrawal和超大有效期不再被旧v1编码阻断；双方SDK／执行文档同步。见[现代快照修复](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261004-modern-preview-snapshot.md)。

最新Kiosk发现复用只接纳同reader.proof引用并保留对象／wrapper／BCS与完整集合核验；3文件63项定向、钱包131文件1416项、完整tsc、开发Webpack和四入口静态审计通过。这批源码静态构建的2eaddb／ef15ecc产物没有审核Local配置，已保留。此前存储迁移就绪修复及显式profile03构建UI SHA c446dd353574351169480316ddeaf521340f644e0bbe347da3e257564cc59acd，background SHA05b4e235093f20812ad0385db7db9af9dfd19f890608ef5987b0038fecab1f24；该批源码稳定构建、双入口AST／4测试、1418全量及39方法闭包通过。该批Chrome有限资产／锁定重启已通过，历史元数据状态／Chrome通过仅对应此前产物；没有本批生产构建或全动态流量验收。

两套方案已整合为13章，14份原文保留，archive原目录保持；后续合同修正同时同步双方。21线协议／18未使用接口的静态闭包已审计，现代SDK／Kit与隔离安装已有证据，钱包及共享core构建阻断已修复。Explorer原79条诊断经本批现代Kit兼容修复降为7条analytics服务缺口，完整构建仍待；不能把钱包产物审计当成其它应用通过。见[共享core注入](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261004-core-injection.md)及Task的NET-09／10／RPC-26。

接口已完成20/26，剩余RPC-03、04、11、13、22、23仍按各自完整合同推进。GraphQL资产／余额／metadata、Fullnode新鲜对象／Coin／地址资金、名称、系统与APY、账户有限窗口及受限归档均已有编码和对应接口证据；逐项是否完成只以Task和日志为准。

### 实际交易与恢复边界

实际混合原生发送1.5 RTD已成功HR27Xmrhd2KPsN4YDCbJzsBYkmcpnnf3NN1m2kW5rEUd、cp398996。实际modern dApp混合WMIG发送1500000已成功6mTumr6izYKqyxrRyTzEwuzgqjj5SbTEL84kLfkmqhnK、cp409864，3模拟／1广播；目标余500000 WMIG Coin和496500976地址RTD，接收方得1500000。批准bytes、签名、effects、双方余额和两条journal整浏览器锁定重启只读复核通过，恢复0模拟0广播。见[混合原生执行](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261004-mixed-native-execution.md)、[混合代币执行](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261004-mixed-token-execution.md)。

原执行harness在链成功后发生报告字段错误，失败记录保持；没有重发，原dApp返回全文未落盘的限制仍保留。mixed-execution-browser-01及mixed-token-attempt-01.json均必须保留，后续只读恢复。旧2RTD／2000000 WMIG准备前提已失效，禁止重跑种子或使用旧金额夹具。

dApp成功、timeout但链成功、批准后取消与链失败已分别有单次提交／原摘要恢复证据；质押实际批准与独立Coin发送已有终态journal。现代标准的输入／消息／只签名／执行合同及后台签名、持久屏障、单次dispatch、终态核验和统一恢复已完成对应任务。完整切换授权、互斥和故障矩阵仍归未完成TX／QA；既有五条dApp和两条质押journal同样不得删除或重发。

### 指定开发环境

runtime为dev-20261003-01，H0为3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj。只使用指定rtd当前源码的debug产物，部署／合约／启动与恢复脚本均在link-u-smart-contract；没有重建genesis、清数据库或绕过发布guard。

profile03 revision2：Fullnode39400，GraphQL https://127.0.0.1:39600/graphql，Archive https://127.0.0.1:39603/archive，账户 https://127.0.0.1:39606/account/graphql。已配置OriginByte，无PersonalKiosk默认推导。适配器6名额、三个消费者各2、guard8；已验证容量配置保持。

此前六服务source4756、indexer4762、consistent4792、GraphQL4804、KVwriter16636、Ledger16643和核心21240的验证属于历史批次。当前D6保留source4756、consistent4792、KVwriter16636、Ledger16643、adapter85593和publisher85638；核心35590、GraphQL35618已切换，indexer35614的原管线进程退出后由有界历史回放66145替代，尚待完整覆盖后恢复原22条及历史管线。旧query-route记录已退出，未计入通过。最新只读工具严格核验14条KV及4条consistent持久化metric集合，00:44:29缺口3885为历史观察；随后00:56:49取得范围交集、生产reader在S176808实际接纳；原有效retention配置哈希保持，未为等待重启消费者。实际完整资产验收和目标checkpoint追平仍未完成，见[本批记录](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261005-core-debug-current.md)。

### 后续优先次序

原共识重放已恢复并证明实际链头推进；生产SQL修复已验证，核心CLI最新debug受控切换和14条KV持久化核验已完成，此前产物Chrome有限资产回归通过；后续D4扩展仍需完整认证历史回放和生产reader／Chrome准入，接下来继续D5–D6和剩余接口，继续定位Docker入口残余超时及完整网络／签名恢复门槛，继续完成剩余六个RPC的页面／资金模式／仓位／NFT与Kiosk合同，推进NET-04能力状态、NET-07正常自定义网络、NET-10消费者影响及NET-11故障预算。继续TX-01／04／07／08／10的最终授权、跨窗口恢复和故障验证；索引追平需以实际共同S及目标checkpoint证明。

补齐ENV-05／06协议和ENV-07正常Chrome证书／权限，完成TRY-02／05的剩余真实核心链路后提供可安装包与说明（TRY-06／07），再推进22项真实QA和最终REL。当前未提供可试用结论，目标持续进行；未执行的项不记通过。

单次只读窗口观察和等待驱动已结束；共同S已由生产reader实际接纳，完整NFT与Chrome尚未验收，不记试用通过。逐次事实保存在[观察记录](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261005-query-window-wait-observations.jsonl)。

最新页面恢复和缓存就绪门禁证据见[本批代码与Chrome日志](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261005-storage-migration-cache.md)；正常CA／自定义权限／直接NFT与非空Kiosk页面／实际NFT转出不在本批通过范围。

### 历史批次：Display历史索引编码与数据库回归

D2已新增历史事件／checkpoint marker／独立连续coverage及事务、冲突、不变式和epoch门禁；66项索引器库测试通过（新增19项含12项实际PostgreSQL）、6项回放准备守卫、GraphQL兼容编译及格式／diff检查通过。当时历史服务未部署、认证回放和D3–D6待推进、主机上下文拒绝旧构建；后续D6当前debug与schema安装已完成，认证回放正在运行，不能把首次覆盖观察当作终态。48/98、trial_ready=false保持，见[本批源码与验证日志](./20261005-display-history-indexer.md)。

### 历史批次：Display历史读取与GraphQL库回归完成

D3已经接入(type,S)历史loader、连续coverage／watermark／genesis一致性校验和GraphQL同S的v1／v2模板basis。36项Reader、247项GraphQL默认features库回归通过，其中新增7／10项含6／2项实际PG函数。两个证明sourceUnchanged=true且与本批当前源码相同；SDL和新增字段范围snapshot已核对，实际7键／1025事件的参数批量SQL执行0.466ms。已修正实际字段请求抓到的Digest输入scalar出参panic，失败记录保留。当时新代码未部署；后续D4能力／钱包准入编码已完成、D6最新debug安装和回放启动已验证，完整认证覆盖和页面验收仍待。父任务48/98、trial_ready=false保持，见[本批日志](./20261005-display-history-reader.md)。
