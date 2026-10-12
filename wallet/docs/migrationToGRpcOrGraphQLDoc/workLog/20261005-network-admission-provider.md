# F2c.2a／F3实际Provider持久负面读取与查询撤值

按[编码前设计](./20261005-network-admission-provider-design.md)与[编码前状态](./20261005-current-state-before-network-admission-provider.md)实施；完整证据见[QA清单](./20261005-network-admission-provider-checks-final-01.json)、[当前37来源](./20261005-network-admission-provider-source-inventory-02.json)、[30份原字节](../evidence/20261005-network-admission-provider-before/manifest.json)及[整个产品原状态哈希重建](./20261005-network-admission-provider-unchanged-product-reconstruction-01.json)。父49/98、trial_ready=false。

## 实际编码与依赖范围

store的begin／complete在原生transaction complete之后才通知。通知为固定v1字符串，不含Fault、profile binding、账户、bytes或授权；同context订阅与BroadcastChannel都只触发capture当前精确native行。离开关闭channel；消息丢失／缺API仍有每次IO前后重读、5秒轮询和focus／visibility重新读取。规范依据[WHATWG broadcasting](https://html.spec.whatwg.org/multipage/web-messaging.html#broadcasting-to-other-browsing-contexts)，[冻结HTML与当前本地策略来源](../evidence/official/20261005-network-admission-provider/manifest.json)；同storage key／channel名及排队任务不保证持久送达，也不是权威发布证明。没有新增Sui协议结论，既有官方／RTD来源保持。

Provider每次effect拥有独立session与WalletReadAdmission，从checking开始。精确Fault按全binding身份或有限domain／Move组依赖处理；身份Fault锁定本session并关闭signal，普通后续空行不能洗掉；身份pending撤去新事实但不关闭transport，原观察真正完成后才能恢复，新操作撤值key不复用旧成功键。Display／assets schema／ABI不会关闭共享session，独立余额／metadata／staking仍按自己的领域与S读取；相应依赖负面仍单独阻止。originByteExecution交易特定ABI门槛／完整NC5写观察协调尚未接入，不把通用prepare负面读取包装误称所有Move交易组已审核。

实际Provider全部方法与保留的asset reader十个方法在调用和返回前按当前native行／session／caller fence重检。存储失败阻止新IO或新发布；已存schema／ABI按具体操作拦截。这里仅消费已有持久负面，不为普通reader新造观察ticket、Fault或H0正例；后台F2c.1真实默认身份守卫继续负责已接入的观察写入。native读后到最终return／授权仍没有原子竞争保证。

core增加纯有限操作readAdmission，只用于撤值，proof的readSessionKey保持原会话身份。查询按操作添加临时撤值key，并通过meta标明依赖。Provider捕获精确wallet prefix＋binding＋session查询集合后取消和移除，不影响其它binding或非链缓存。余额、metadata、staking、资产、索引、名称、收件人、fresh balance/coins、history、receipt及receipt indexing消费当前门槛；history／receipt当前error隐藏保留旧data，显式disabled资产／staking也隐藏旧value与proof。Query persistence已有wallet-*及mutation排除未改。后台dApp preview的null frontend-session键不会因前端checking／pending而取消后台正在持原ticket的观察；已知身份负面仍撤去对应新preview。完整批准UI旧值／最终授权、readonly原journal例外和所有UI状态仍另待。

## 当前验证

- 两个新增文件41项：31个控制器／依赖／存储失败／晚返回／保留reader测试与10个实际React／QueryClient测试。React余额使用真实GraphQL SDK／独立S协议；capture为明确控制流fixture，不冒作native持久证明。
- [定向04](./20261005-network-admission-provider-targeted-04.log)8文件131项与[定向06](./20261005-network-admission-provider-targeted-06.log)10文件47项，18文件178项均实际exit0。旧Provider协议fixture只mock capture，production缺API仍拒绝。既有21秒慢资产分页仍通过。
- [完整钱包02](./20261005-network-admission-provider-full-wallet-02.log)163文件2285项，57.58秒，实际exit0，无过滤。RPC／钱包／harness三套类型与37文件格式实际exit0，日志SHA见QA清单。
- [原生Chromium01](./20261005-network-admission-provider-native-01.log)13项：真实IDB／BC、跨页pending／原owner完成、identity撤值、Display保留独立余额、伪造positive消息不能洗负面、dedicated worker通知、持有旧native capture返回后重读、消息丢失读前拒绝、无消息5秒轮询、success→abort无通知、裸production默认store／控制器与正常整浏览器重启。pageError、外部请求、实链、simulate、sign、Execute全0。业务callback为公开受控返回，不是native SDK或真实扩展业务验收。

## 首次失败和范围保护

[诊断原字节](../evidence/20261005-network-admission-provider-diagnostics/manifest.json)保留最初两处query键断言、fixture this类型失败和补齐存储后六份旧下标／meta断言来源。定向01实际1；类型02实际2；完整01实际1（10文件43失败／2242通过）；定向05实际1（10失败／37通过）。没有抹去失败或先记通过。两个编辑脚本／精确patch定位失败也记录为编排失败，未当QA通过。一次版权头整理误触execution-reader已准确逆转；只读哈希重建将30份原字节代回并排除5份新增产品源后，整个1063文件产品SHA完全等于上一批5f046fc5…，证明其它源码／配置／SDK没有残留变化。

最终产品1068文件SHA为9496af2d7520ad00c302beef7bb9a01aa4c5283d0341ef25596c780a87e2f072。上一轮中间27来源inventory01及首次失败记录保留；当前依据37来源inventory02及114个当前跟踪来源。旧C9 ui/background磁盘产物保持，未构建新扩展、未运行Chrome真实钱包或dev；未重启PID66145、未改原journal／交易根、RTD／SDK。原生正常重启不等于物理断电。

## 后续顺序

先完成F1c–d的同session NC5四族聚合与可信Webpack输入、四角色／domain／Move observation原ticket协调；继续F2c.2最终发布／授权竞争，F3全部批准UI与F2d旧journal只读例外，再做F4当前构建与正常CA核心Chrome。未签认的独立发布pin／服务build revision／可选部署、六项RPC资产staking业务及完整试用门槛均保持开放。本批不勾新增父任务，不把stored-clear或configured叫ready。
