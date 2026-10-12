当前接续入口已更新至[2026-10-11 C255剩余五父证据与依赖](./20261011-C255-release-evidence-map.md)：C251发布器及正式回放适配器已安装并独立验证，当前钱包C250；C253实际质押确认，C254展示修复构建已完成、尚待安装。以下C240及更早状态保留为历史。

# 当前执行顺序：QA / REL 五项收口（2026-10-11，C240）

主人已将“试用期间真实回归”“发布清理与完整验收”设为最高优先级，NFT限制已解除。以Task原98项为准，目前93项完成，开放QA-A15、QA-A17、QA-A20、REL-02、REL-05；QA-A19已完成，不重复计数。下方旧NFT优先级、9/14父计数、安装待确认及历史锁屏均仅作历史。

| 当前父项 | 完整完成合同与现有证据 | 当前可执行工作及依赖 |
| --- | --- | --- |
| QA-A15 | 当前G3正向/默认反向、缺失/过期、错链/lag、改名续期，以及显示名与最终发送地址分离。旧名称根ABI/BCS、当前lag拒绝可复用，但不能替代当前正向。 | C240已在C238普通Chrome复现lag后“地址无效”误报，先修复并抓包复验。正向等待正式发布与NAME覆盖追到当前native；不降低20 checkpoint新鲜度约束。 |
| QA-A17 | 全查询/归档/HBase/account保留数据、换H0/换generation、URL/registry与迟到请求完整矩阵；两账户全数据比较与WAL。 | 完整固定范围0..709569的41持久管线继续重放。C237已到最低399144，仅为数据进度；按完整重放结束后全量比较和浏览器矩阵执行。 |
| QA-A20 | 完整当前dev保留数据冷启动，依赖启动次序，全部恢复与普通Chrome journal保持。 | C151有限冷恢复可复用为子证据；实际完整冷启动须等当前publisher批次自然结束或符合既有安全交接条件。活动父子/锁1不能按状态文件较旧误杀。 |
| REL-02 | 全部资金/NFT/质押/名称/dApp/历史/设置的当前普通Chrome流量，完整三入口审计，无旧JSON-RPC/错误Sui公网。 | C237非空余额/资产/Kiosk/NFT详情/历史/发送与质押预览已取得证据，继续名称、设置与dApp及实际业务全矩阵；API/静态闭包不替代UI。 |
| REL-05 | 每份技术文档、每个RPC、每个页面、A01–A22及98原项的完整来源/当前源码/实证追溯，无缺失必需项。 | 同步整理证据映射，最后在前四父项完整通过后审核勾选，不以“工具已准备”替代业务通过。 |

执行上优先做不依赖索引追平的真实UI及静态映射，后台保留发布和回放持续工作；准备不计父项完成。C239候选已因完整回归暴露持有证明反例撤回，当前Chrome仍C238，停止无关性能扩展。后续钱包同路径升级与现有dev钱包解锁按主人持续授权执行。

---

以下保留历史原文：

C116补充：单RegionServer的显式运行/共享查询核心窗口已实读通过，完整cold/WAL仍待；可继续C115非NFT核心与dApp验收，后续每次重取完整300秒覆盖。[实际边界](./20261008-C116-post-restart-query-acceptance.md)。

# 当前执行顺序：所有非NFT先验收（主人2026-10-08新指示）

以[C115第一阶段及NFT队列](./20261008-C115-non-nft-first-acceptance.md)为当前入口。原九父／98范围保持，原表中的NFT优先次序已被主人新指示取代；先NN-01–09全部非NFT条件，再C113／C114及NFT M3，最后完整REL-02／REL-05全98终验。通用环境恢复与源debug／数据／权限／TLS等完整门不降低；名称及非NFT授权／恢复不延期。

以下保留原执行历史。

# 当前剩余9父任务的验收顺序（2026-10-08）

C102[完整父审核](./20261008-C102-five-parent-completion-01.json)已完成RPC-22／23、TX-08、TRY-05、QA-A07；89/98，细分剩余9.18%。现依次推进TX-04四路M3与M5、TX-01内部NFT最终bytes／赞助／有效期完整汇总、QA-A15当前名称；ENV-07／QA-A19普通Chrome初始化与TLS权限；QA-A17／QA-A20完整环境生命周期及冷恢复；最后REL-02全部实际功能流量与REL-05全部98最终审计。trial_ready=false，原完整合同、原六笔0重发及working publisher保护保持。

以下保留原14父的依赖与历史观测，不表示当前开放数；原五父收口不把其他九父提前计完成。

# 剩余14父任务的当前验收顺序（2026-10-08）

这是98项Task的执行依赖表，不另增分母或把准备记为父完成。当前84/98、trial_ready=false；历史全部失败和原始证据保留。原六笔C48成功交易只读恢复，禁止重发。原批次等待正式marker，不以prepared／诊断计数替代覆盖。

| 次序 | 父任务 | 必须完成的当前工作 | 前置条件／范围 |
| --- | --- | --- | --- |
| 1 | RPC-22 | 四类实际转移后的完整持有／内容及页面刷新 | fresh七门≥524022；当前C92十三对象／五cap／三账户，C88完整summary与原帧独立审核 |
| 1 | RPC-23 | 转移和风险提示／收款目标／旧调用清零的完整联验 | 原六成功／当前C42风险提示已保留；补三个owner完整写后读与页面联验 |
| 1 | QA-A07 | Kiosk package、cap、personal／OB、限制与可转移性逐分支 | 与RPC-22共用当前完整数据，不缩为单source或少量对象 |
| 1 | TX-08 | 六交易覆盖后收据／资产／收款页真实刷新 | 链终态保持；原C40滞后→刷新和C43质押子项不能替代全部NFT |
| 1 | TRY-05 | 当前三入口资产／分页／历史详情／同链package核心联验 | 生产API正向加当前Chrome；C88历史／fixture只算审核工具资格 |
| 2 | TX-04 | M3四类NFT真实live竞争和durable pending、M5独立全入口审核 | M1／M2／M4已完成；不因六笔成功或共用守卫推断真实竞争已验 |
| 2 | TX-01 | 全部内部NFT、赞助、有效期和再授权最终字节完整矩阵 | 当前C46 dApp和内部币／stake／withdraw Gas子项已有证据；按实际资金模式区分拒绝与双签执行 |
| 2 | QA-A15 | 当前G3名称正反向／改名续期／过期缺失／错链lag／最终目标UI | 真实当前registry和正式窗口；旧generation正面或字段fixture不代替 |
| 3 | ENV-07 | 普通Chrome UI／worker TLS与同链三入口／host permission | C51安装已获主人许可且完成；初始化及CA待决步骤保留，不再申请同一安装 |
| 3 | QA-A19 | 新装／更新、权限批准拒绝、自定义网络、正确CA／错误SAN、demo CORS | 新空profile，不导入原钱包，不绕过证书告警；UI和worker实际分别验证 |
| 4 | QA-A17 | 同host换H0／同H0换generation、URL／registry、全查询归档生命周期与迟到响应 | 先完成当前核心试用路径；使用独立受控环境和精确恢复计划，保留源／debug／原数据 |
| 4 | QA-A20 | 完整dev／普通Chrome故障、保留数据冷恢复、依赖顺序与journal保持 | 有限C67／C79合同已完成；原发布批次结束后再规划全dev操作，不能将7服务有限合同升级为全dev |
| 5 | REL-02 | 全部实际Chrome功能抓包与三入口观测，独立无旧RPC／公网误访审核 | 关联全部业务页面／资金／NFT／名称／dApp／历史；静态闭包和API抓包不能替代 |
| 6 | REL-05 | 全部98父项逐文档／RPC／页面／A01–A22最终完整审计 | 证据范围和来源可追溯、必需项全部完成之后，才报告100%并完成goal |

实时运行依据：[七覆盖05](./20261008-C83-nft-post-write-readiness-05.json)、[原发布完整尾部05](./20261008-C87-current-publication-observation-05.json)。06:05前后的观测为正式486334／pending553728、完整prepared53892行至540226、作用域lock1；prepared虽已越过目标524022，仍不是正式覆盖。

完整工具依据：[C85生产准备](./20261008-C85-full-post-write-preparation-independent-01.json)、[C88独立准备](./20261008-C88-full-summary-preparation-independent-01.json)，原51合同与新29项资格通过。S88-5／P85-3／4保持开放；待真正满足七门，再执行原C85生产正向和C88独立审核。

C89最新准备与唯一观察：**84/98，14父项开放（14.3%），trial_ready=false**。原29容器／14健康和25 actors保持；普通Chrome已按主人许可安装，密码／条款和CA仍待此前步骤。最新[06:26窗口02](./20261008-C89-completed-current-window-02.json)为正式486334／pending553728、prepared67394、原父7463／child17722工作及lock1；pending producer／advisory版本日志不是正式提交。C89的[136控制器](./20261008-C89-completed-handoff-tests-01.json)、[独立准备](./20261008-C89-completed-preparation-independent-01.json)、[完整写后读工具](./20261008-C89-full-post-write-preparation-independent-01.json)、[30观察器](./20261008-C89-completed-observer-tests-01.json)、[独立绑定](./20261008-C89-completed-observer-independent-01.json)及[实际16417](./20261008-C89-completed-observer-running-01.json)通过，P89-1–3限定完成。唯一5400秒观察器仅在自然published≥553728、pending／prepared／child／lock清空及全部fresh门通过后单次交接；尚未安装。七门≥524022后用C89 ownership完整十三／五／三／六production及C88 full summary独立审核，再验Chrome／14父；原51合同和C88 29资格保持，原六交易不重发。C87优化不启动、0新容器，累计精确清理176。 P89-4／5／6仍待实际完成，不改变上表完整验收顺序。

当前执行入口切到C91完整断点接续，旧C89观察已精确退役；[62832真实冻结／排空](./20261008-C91-running-drain-independent-01.json)已通过，原7463仍live／无child、正式486334／pending553728／完整67394三版本保持。原81／新93／observer47以及ownership-only13／5／3／6和51／C88 29准备通过；需真实正常旧退出／原C50启动、正式七门后C91 production＋C88 full审核，再验上表全部父合同。进行中排空不等于安装或索引验收。

C91当前已由[安装独立终验](./20261008-C91-installed-handoff-independent-01.json)收口P91-4：原7463正常退出／stopped／PID移除，新67724原C50／venv及完整authority成立，旧／新observer均结束，实际三原父信号且0child／group。[安装后七门02](./20261008-C91-nft-post-write-readiness-02.json)仍正式486334／pending553728、不足524022；安装不计任何父完成，按上表完整13／5／3／6 API／原帧和Chrome／14父继续。


当前运行已由C92纠正接续：67724原是C44串行入口并缺依赖自然失败，旧C50安装叙述不成立；正确C5092149现已真实一次启动及独立终验，0信号／直接数据写。最新七门仍486334／553728不足524022，使用C92完整13／5／3／6及C88审核后按原14父完整顺序推进，安装不计父完成。普通Chrome初始化／CA原pending不变。


C93已真实提供独立四类库存：唯一Execute／原失败留存／原摘要只读恢复687127，八NFT／五cap、原十三与policy保持，38成功gRPC原帧及两Faucet完成独立审核；唯一原空body lag回复headers缺失、原grpc-status未认证。此库存用于上表TX-04 M3／TX-01后续完整矩阵，仍待正式资产快照和真实产品入口；不替代原C48六笔524022的C92完整13／5／3／6写后验收。P93-1–4限定完成，P93-5与所有14父继续、84/98、trial_ready=false。源／八debug／29容器14健康25actors与1015原保护文件保持。


C94的14真实NFT core检查／84请求／9ENABLED模拟／2本地同byte签名和27对象保持已完成限定审核，83成功完整回复及1实际过期header均解码；实际更改Gas／收款方／None有效期的成功模拟仍拒绝旧digest，sender／会话／取消0IO拒绝。此证据补TX-01 core；仍按上表补全部Kiosk、生产Provider／Chrome guard、四路live／durable及实际赞助双签收集／执行，不用core替代任何父合同。C93新687127正式快照与原C48六笔524022的C92完整13／5／3／6分别推进。84/98、14父开放、trial_ready=false。


C95已真实完成当前Wallet Standard sender批准＋独立测试sponsor／外部gRPC双签专用NFT，178请求完整审核及两原digest只读恢复、sender余额保持／sponsor实际gas1024244、27原库存保持。TX-01的该赞助工作流已补实际证据，Wallet单签execute拒绝仍保持，全部内部Kiosk／Provider及普通Chrome、四路competition／durable合同继续；不得将外部提交记为Wallet coordinator恢复。C93 newTarget现在额外持有serial95专用NFT，后续完整账户资产／分页须纳入，OriginByte新target Kiosk仍无创建。原六524022与C93库存687127正式覆盖仍待，84/98／14父继续。

C96 P96-1–3及精确只读identity接续完成，3149回复／1053 body和3.625中位提速仅资格；正式七门仍缺，当前child／lock1保持，0信号且候选未安装。完整13／5／3／6工具准备不改变上述14父顺序；P96-4／5仍需实际发布／索引／Chrome。见[日志](./20261008-C96-progress.md)。


当前C96阶段：正式553728已提交／pending空／prepared0，旧96377自然结束，下一批59696工作。完整七覆盖02已通过正式门，其余六门仍不足524022；候选未安装，观察器56829精确只读等待自然终态，plan／stage均未产生。[实际依据](./20261008-C96-live-next-batch-and-no-activation-01.json)及[当前日志](./20261008-C96-progress.md)取代上方历史进程状态；全部14父范围保持。


C96后继查询工具已按[完整独立资格](./20261008-C96-successor-post-write-preparation-independent-01.json)接续原13／5／3／6与51／29；部分activation拒绝旧回退，当前仍未安装。最新readiness正式553728，六门不足、最低约495411；门齐后优先用新完整工具正向及独立BCS／完整页审核，再做原完整Chrome／M3／14父合同，不以资格收口父。


当前下一批以[实际进行中资格](./20261008-C96-working-publication-observation-qualification-01.json)为准：正式553728／pending709569／prepared0／lock1，原工作child59696保持；只读进度输出不放宽终态交接。4组45检查与实际原terminal拒绝已完成，候选仍未安装。[七覆盖02](./20261008-C96-successor-nft-post-write-readiness-02.json)最低502105/502107/502108、六门不足，原14父顺序和全部范围保持。


最新依赖：[C97完整实际实验](./20261008-C97-progress.md)完成限定128ABBA／136帧及全部原故障检查，但双并发性能门不全成立，不安装；五临时已清理，累计181。C96观察自然结束未交接，原发布工作保持；[最新七覆盖03](./20261008-C96-successor-nft-post-write-readiness-03.json)最低约507839／六门不足，按原完整14父顺序继续，不重发任何原交易。


C98当前接续已按[283子检查／完整源码独立](./20261008-C98-handoff-source-independent-01.json)资格及[原51／29／13／5／3／6工具](./20261008-C98-successor-post-write-preparation-independent-01.json)完成P98-2／3。新[45917唯一3600秒观察](./20261008-C98-observer-running-01.json)当前无activation；仅自然当前709569终态与原完整fresh门后一次安装，原工作父子零信号。[七门01](./20261008-C98-successor-nft-post-write-readiness-01.json)正式553728、最低515159、账户515086，六门仍不足原524022。先完整API与C88，再上表全部Chrome／四路M3；原14父不缩小、84/98保持。


最新状态（2026-10-08，C98实际安全接续完成）：**84/98，14父继续（14.3%），trial_ready=false**。[实际六阶段独立终验](./20261008-C98-actual-handoff-independent-01.json)认证原709569批次自然waiting_timeout、无child／lock0和完整32104行连续prepared不变，原92149正常stopped／PID移除，新83360实际原venv／C96合格候选已安装并工作。[唯一观察终态](./20261008-C98-terminal-handoff-watch-01.json)真实1150.836秒结束、一次attempt／installed，完整原父STOP／TERM／CONT收据，0child／group信号、0直接SQL／object业务写。原1456文件／29容器14健康25actors／source八debug及产品1120a03保持，清理累计181。[安装后七门03](./20261008-C98-successor-nft-post-write-readiness-03.json)正式553728／pending709569，六门仍不足原524022；完整13／5／3／6 API与C88独立审核、全部Chrome／四路M3及14父仍待。P98-4及P96-4限定接续完成，P98-5／P96-5继续；普通Chrome安装许可已执行，原初始化／CA步骤待主人。

C99[完整四路合同](./20261008-C99-current-four-nft-M3-design.md)纳入C95 serial95，库存最小696489，不能过滤newTarget或替换原六524022；[真实0IO preflight](./20261008-C99-nft-inventory-preflight-01.json)通过拒绝，不计正向库存或Chrome。
