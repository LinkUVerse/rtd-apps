# NET-04 NC4：账户历史协议、能力与原生包事实修复

本批承接[NC3C](./20261005-deployment-contract.md)。[实施前设计](./20261005-account-history-capabilities-design.md)与[旧状态快照](./20261005-current-state-before-account-history-capabilities.md)先保存，再按H1–4推进；真实失败后H4a错误分类与H4b包事实修复也分别先设计、保存原字节。父49/98、trial_ready=false；本批账户限定窗口验收不替代全接口／完整试用。

## 实际行为

提取唯一两根accountHistoryCoverage／accountHistory的精确selection、原生六availableRange依赖与前后窗口digest核验为account-history-protocol；原reader保留完整分页、六旗标、snapshot／opaque cursor、总数／顺序／去重以及tx／effects／events BCS事实接纳。所有页和末尾独立extension／native校验结束才返回；partial不是空集合。新增minimumCheckpoint只要求窗口已覆盖明确下界，不将Fullnode当前高度自动视作历史全集。

生产reader仍默认20秒、20行／100页；探测默认30秒，显式1–60000ms。固定POST精确两个URL，账户payload16KiB、响应streaming2MiB、MVR空、credentials omit／redirect error。总signal与共享四个物理leaf名额保持；外层取消可以结束，忽略abort或异步取消body的leaf必须等真实cleanup完成才释放名额，迟到不发布、不继续发请求。原生HTTP显式backoff保持，扩展入口不自动重试。accountHistory独立NetworkIdentityError角色、canonical32字节H0与结束时已知native错链优先；identity探测三角色并未增加第四个native endpoint。

无账户探测只有coverage-window-verified、accountScope=not-probed；显式公开账户实际调用整个生产reader，输出hash、snapshot、计数和原样六旗标，不输出地址／交易payload／client／签名权。scope=declared-fixed-window-union，snapshot仅service-binding-only、cursor仅service-authenticated-opaque；服务绑定含未返回注册集，不能伪造客户端SHA重算或取得服务HMAC secret。allAccountHistoryVerified固定false，不生成全集ready。

## 真实失败推动的修复与权威对齐

[官方固定GraphQL规范与3官方／15本地源码摘要](../evidence/official/20261005-account-history-capabilities/manifest.json)区分标准与RTD自定义入口。自定义SDL是两根、Checkpoint为JSON UInt53、required与nullable bool不同；不做通用introspection。GraphQL规范允许部分响应；钱包errors非空整组拒绝是本产品策略，不能称官方禁止partial。

[诊断02](./20261005-account-history-capabilities-diagnostic-02.json)实际HTTP200返回HISTORY_UNAVAILABLE／UPSTREAM_HTTP_ERROR／503，没有page；[诊断01](./20261005-account-history-capabilities-diagnostic-01.json)更早coverage partial也保留。现仅单一合法公共扩展错误允许白名单分类：BUSY／依赖不可用／上游HTTP、timeout、transport明确不可用，snapshot／coverage变化为changed。未知、畸形、额外内部字段或混合errors仍partial，任何data不能接纳；不回传服务message或凭据，不把服务CHAIN_MISMATCH reason冒作客户端已验证H0。生产UI复用RpcError的繁忙／不可用类别；已知尾部错链仍优先。

[诊断04](./20261005-account-history-capabilities-diagnostic-04.json)实际返回57838字节、5条事实，失败位置在history-facts的objectTypes规范化；[诊断05](./20261005-account-history-capabilities-diagnostic-05.json)只记录类型类别／BCS枚举，cp201271有package与PackageWrite。所有gas值实际number，未获证实的gas猜测已排除。[Sui固定render源码](https://raw.githubusercontent.com/MystenLabs/sui/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-rpc-api/src/grpc/v2/render.rs)将包类型表示为package，Struct才渲染Move类型；[Sui effects-v2](https://raw.githubusercontent.com/MystenLabs/sui/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-types/src/effects/effects_v2.rs)区分PackageWrite及其独立版本。当前RTD对应源码一致，SDK只读保留此原生标记。

history-facts现先从已核验effects BCS提取object输出状态；精确package仅与V2 PackageWrite一致时保留，PackageWrite缺标记／伪称Move类型、ObjectWrite等状态伪称package、畸形标记或重复规范化ID均拒绝。原BCS／effects digest／tx sender／kind／gas／事件／排序／窗口检查保持；V1无此独立包判别证明仍拒绝package。包标记不证明执行语义、包全部bytecode或部署审核，不合成旧RPC DTO。

## 测试和失败记录

最终[完整检查](./20261005-account-history-capabilities-checks-final-02.json)：[153文件2032项全量](./20261005-account-history-capabilities-full-wallet-04.log)全部通过，运行器maxWorkers=2、没有测试过滤；生产期限、请求名额与上限没有改变。[147定向](./20261005-account-history-capabilities-targeted-04.log)、[完整钱包类型](./20261005-account-history-capabilities-types-wallet-03.log)、[RPC类型](./20261005-account-history-capabilities-types-rpc-05.log)、[明确七脚本类型](./20261005-account-history-capabilities-types-scripts-03.log)与[格式](./20261005-account-history-capabilities-format-check-03.log)实际退出0。比NC3C新增91项，含独立来源／SDL、完整两页成功＋失败事实、空页、H0／末验、HTTP／partial／预算、所有原旗标与超时／body异步清理、服务错误分类及包BCS错配反例。夹具只证明协议算法，不能代替真实链或部署权威。

全部首次失败保持：[targeted01](./20261005-account-history-capabilities-targeted-01.log)80/83、[RPC类型01](./20261005-account-history-capabilities-types-rpc-01.log)退出2。前者两个错误spy断言已改为实际requests，body-held夹具此前未等待reader持锁，并暴露取消迟到headers未等body清理，已实修生产cleanup及反例；后者从狭窄夹具graphql类型错误借用getOperationAST，现直接引用已安装类型，没有改依赖。[包夹具类型04](./20261005-account-history-capabilities-types-rpc-04.log)退出2，修正BCS输出枚举必需的$kind后05实际0。[默认并发全量03](./20261005-account-history-capabilities-full-wallet-03.log)2031/2032，既有名称leaf夹具100ms期限可能先于entered触发，等待5000ms超时；在不改变源码／生产限额的情况下减少测试worker，04完整2032通过。该第一次失败不删除、不宣称默认并发已通过或既有夹具时序完全修复。

诊断过程的错误路径（ledger_history.py、localDeploy/native*、不存在的contract scripts目录／account reader文件、tests/setup*）、一次patch上下文失配、source inventory临时relative_to越界与manifest local file/path误读也没有记为检查通过；按实际目录／schema修正后继续，原错误保留在工具历史及此日志。

## 真实只读范围

[coverage01](./20261005-account-history-capabilities-public-coverage-01.json)五次只读请求全部200、窗口176712–288451及pin digest通过；没有账户页，accountScopeVerified=false。[公开target诊断03](./20261005-account-history-capabilities-diagnostic-03.json)六次完整reader读取通过，但实际0条，不能证明非空事实或最近资金已入窗口。

[owner01](./20261005-account-history-capabilities-public-owner-01.json)与[owner02](./20261005-account-history-capabilities-public-owner-02.json)虽六次HTTP200但incomplete response，未作通过；错误类型及实际503／package诊断分别保留。[修复后owner03](./20261005-account-history-capabilities-public-owner-03.json)已读page却在末尾coverage触发30秒总期限，实际CLI退出1／probeCompleted=false，不作完整scope通过。

[最后owner04](./20261005-account-history-capabilities-public-owner-04.json)按同一30秒预算实际CLI退出0，6次只读HTTP200、scoped-window-verified、完整5条及前后native／extension proof全部通过。窗口176712–288451、digest Dcwn8ykysCH3EXWj85XZ7cQC1CfDjs2Qq2FPiyze6e7s保持。registrationComplete=false，registered Kiosks／discovered owner tokens／capabilities的各限定旗标true，allAccountActivityCertified与allAccountTransfersCertified均false，原样保留。没有selector地址、交易payload、cursor或账户列表输出；0模拟／签名／Execute。[生产默认20秒独立末验](./20261005-account-history-capabilities-default-budget-proof-01.json)及[脱敏结果06](./20261005-account-history-capabilities-diagnostic-06.json)也实际完成6次请求、5条事实与全部末验；源码副本验证harness没有timeoutMs覆盖。这个实链限定reader通过仍不代替当前Chrome或完整迁移验收。

## 来源、环境和后续

[冻结清单](./20261005-account-history-capabilities-source-inventory-01.json)9本批来源、前40份能力源码逐字保持，合计49当前来源；1046产品文件、ace25197d559e52e92bb354469b1f5e4c905c93d9422c2243596ddccbced9ec6。三个阶段[初始3副本](../evidence/20261005-account-history-capabilities-before/manifest.json)、[服务修复前3副本](../evidence/20261005-account-history-capabilities-before-service-errors/manifest.json)、[事实修复前1副本](../evidence/20261005-account-history-capabilities-before-package-facts/manifest.json)原字节保留，全部.txt纯文本后缀不进入Vitest。此批未修改SDK或RTD源，未构建／安装新产物、未做新Chrome；磁盘双bundle仍历史C9，不能当当前源码运行验收。

[回放只读检查02](./20261005-account-history-capabilities-history-02.json)实际0、严格连续0–199423／199424 markers，原22水位不变、最新RTD源和8 debug provenance通过，PID66145运行through386503、boundedExitCode=null。没有restart／resume或操作原交易保留根，D5旧拒绝调查保持。需要dev仍遵守最新debug＋指定智能合约仓脚本约束。

H1–3、H4a／b及本批有限验证完成；NC5完整聚合／可信配置／CAP6全局负面状态与缓存撤值、NC6当前产物与完整核心Chrome继续。NC3C真实独立发布声明、可选名称／Kiosk部署及服务运行build／revision签认仍缺；原六接口、全部业务批准／正常CA／锁定整轮及完整试用余项继续，49/98、trial_ready=false。

## 文档与来源收口

[完整核对01](./20261005-account-history-capabilities-document-verification-01.json)实际退出0：37文档／931有效本地链接，双方74共享H2（73逐字一致，1仅07→08规范编号链接差异），49当前来源／14原字节副本／12官方与54唯一当前来源摘要保持。六脱敏harness原字节、同账户5条完整scope及默认20000ms无覆盖证明均核验。三仓git diff --check实际0；[规范合并核对](./20261005-account-history-capabilities-canonical-docs-01.log)13章／14保留原文／22QA／21RPC通过。Task仍98项中49完成，trial_ready=false。
