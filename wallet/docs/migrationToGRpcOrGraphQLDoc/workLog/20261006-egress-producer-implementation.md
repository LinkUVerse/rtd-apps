# E5/E6 实际 producer、请求生命周期与 C17

当前1103份源码 SHA73c0e8ca11bb4886a2264e87f6ed31fc622779bad56cb83e2941d578f96dd0e6。实际producer、后台封存信封、原生业务来源、私有broker/gate、content代理与Wallet Standard入口已接入；UI先检查top再动态import，后台同端口挑战及原生context复验。原manifest新增专用gate WAR/webNavigation/Chrome116最低版本，frame-ancestors允许gate；UI和业务接口另有原生来源门槛。正式页面消息流拒绝旧窗口签名响应。

签名与实际Execute fetch分别以内层原生上下文/准入readonly回调启动，每阶段最多一次，lease在动作前捕获且最终结果使用同一lease；不会拿到旧签名后重捕获新revision。后台仅按固定交易推导依赖域，PersonalMessage空域不访问归档/索引，所有identity负面门槛仍全局保留。响应2MiB预算兼容原1MiB消息。审阅依据及实施顺序见[前置合同](./20261006-egress-action-design.md)；不是Sui协议规定的2MiB。

Transactions的原请求signal、原生连接、网络/账户监听保持到gate交付ack；正常finally再删除临时请求/撤销prepared。UI确认不能用传回的任意bytes/signature替换后台封存结果。个人消息也注册连接取消。错误不重捕获/重签/重播；原journal独立保留。

## 有限实际证据

- [原生动作/域/预算](./20261006-egress-action-native-03.json)：65项、真实IDB、1次公开dummy；动作stub和签名/广播区分，0真实签名/Execute/原库打开。原生v1升级/Fault/pending保持、动作阶段一次性、上下文变更先提交时不启动stub、相关域故障拒绝、无关assets故障允许完整1MiB消息通过。
- [正式私有通道复验](./20261006-egress-action-transport-native-01.json)：33项，正常/严格CSP/COOP、70次连续交付、旧通道与伪造拒绝、取消及held receipt。这里仍是公开AA== fixture，不能替代真实Wallet Standard签名接受。
- [UI原生来源](./20261006-ui-native-guard-04.json)：5项，真实TAB/工具栏POPUP正常，两个iframe拒绝。01脚本误调用worker.waitForFunction失败；02/03证实popup没有sender doc/frame/lifecycle，原始观测保留；04按唯一nativecontext/私有同端口挑战复验后通过。
- [全量](./20261006-egress-producer-full-02.log)176文件2501项；[类型](./20261006-egress-producer-types-04.log)actual exit0。定向99项及后续43项包括交付ack前生命周期/取消、未封存结果拒绝、UI替换结果不被采用。全量01四项旧connection fixture缺原生sender失败，补可信完整fixture后02通过，不放宽生产来源检查。
- [production03](./20261006-egress-producer-production-build-03.json)、[全闭包审计](./20261006-egress-producer-production-audit-01.json)：五个entry、7个JS、5271展开模块和2031源码，旧RPC/SDK传输/Kit/fixture排除。01/02失败因ES5 ts-node在审计helper中错误展开Set；保留首次产物/日志，改Array.from后真实ts-node复验并重构建03通过。2项构建warning单列。
- [C17构建](./20261006-egress-producer-c17-build-01.json)：actual0、当前源码不变，旧C16全产物保留在私有 egress-producer-c16-before-c17-20261006-01（真实目录名见JSON）。新UI为独立bootstrap及异步chunk。
- [C17普通CA只读Chrome](./20261006-egress-producer-c17-readonly-01.json)：新UI三个实际加载JS与worker精确匹配、真实UI挑战/只读命令及启动完成、pageError0、0签名/模拟/Execute。Fullnode同H0；三HTTPS TypeError，networkIdentityAccepted=false。进程passed只表示有限检查执行，不是TLS/四入口通过。
- [C17原7journal](./20261006-egress-producer-c17-original-journals-01.json)：两保留profile、七原effects/逻辑hash保持、7次原链只读lookup、0模拟/dispatch，当前worker逐字匹配。此次去掉旧SPKI例外，manifest惰性页面未读取HTTPS，无证书信任改动；此证明不构成正常HTTPS接受。升级前51份数据store文件离线校验备份在私有 original-stores-before-c17-20261006-01，备份不是恢复/回滚验收。

04:15只读TLS SQL最低572835及Display严格coverage通过；04:19 native consistent/GraphQL仍586007，未证明共同业务S。当前11伴随进程最新debug/拥有身份及publisher状态通过[只读拥有清单](./20261006-producer-runtime-owners-01.json)，零重启/信号，不能把存活称所有业务ready。第一次错误Python解释器SQL探测失败保留，指定venv后只读观察02通过。

父任务58/98保持。接续C17实际Wallet Standard签名/执行/事件矩阵、核心服务共同S、独立发布声明及正常CA门槛；E7仍未整体完成，trial_ready=false。所有首次失败和执行源码均保留，旧C16/E3/E4动态结果不称C17接受。
