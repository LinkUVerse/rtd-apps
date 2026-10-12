# NET-04 NC4：账户历史合同实施前设计

承接[NC3C](./20261005-deployment-contract.md)。[旧状态](./20261005-current-state-before-account-history-capabilities.md)与[reader／测试／身份类原字节](../evidence/20261005-account-history-capabilities-before/manifest.json)在修改前保存，副本使用.txt避免旧测试被Vitest收集。当前[只读前置](./20261005-account-history-capabilities-prerequisites-01.json)HTTP200、176712–288451、全集认证false；没有真实owner-page／native proof验收。父49/98、trial_ready=false继续。

| 子项 | 编码前状态 | 必需交付 |
| --- | --- | --- |
| H1 | 待实施 | 从现有reader提取唯一账户coverage／page查询、原生六依赖、窗口digest／旗标校验；固定custom SDL独立验证，禁止自省或两根合并 |
| H2 | 待实施 | reader与探测统一单总期限／2MiB／POST精确两个端点／共享leaf／取消迟到；错误角色accountHistory与已知错链优先，规范单根响应／UInt53等边界 |
| H3 | 待实施 | 不带账户只声明coverage-window；显式账户复用整个生产reader全部分页／事实验证，报告地址hash／计数和原样scope旗标，不输出业务payload，不声明全集或ready；可选最低checkpoint要求 |
| H4 | 待实施 | 固定SDL／来源与transport／flags／范围／分页反例、全量／完整类型及当前真实scope，双方／Task／总进度收口；NC5–6／CAP6仍必需 |

[官方固定GraphQL规范与六个当前自定义服务源](../evidence/official/20261005-account-history-capabilities/manifest.json)分开。此入口不是Sui原生GraphQL、没有通用introspection；两根必须分别一请求。schema中Checkpoint是JSON integer<2^53，required bool与nullable bool不互换；totalTransactions在明确页数预算内。GraphQL允许partial response，本产品要求errors非空即整组拒绝是RTD策略，不宣称规范禁止partial。

当前reader已在读取前后校验extension窗口和原生六availableRange／pinned digest，逐页地址／limit／snapshot／计数／旗标／cursor推进／事实BCS与顺序去重。但fetch响应尚无2MiB streaming上限，忽略abort底层会拖住外层等待；本批实修，不只加report wrapper。提取protocol并保留现有查询export，read依旧完整消费所有页才返回。每次请求完整body结束前共享四物理名额占用；总取消能结束外层，迟到不能发后续或发布结果。已知accountHistory H0 mismatch应为独立角色NetworkIdentityError；native mismatch仍为graphql角色。明确known chain只接受canonical32-byte H0。

coverage-only必须前后独立扩展与native窗口校验，不能代替owner page的方法正例；未提供账户为not-probed scope。显式账户能力必须真正调用整个现有reader，返回scoped-window-verified和所有原样coverage flag；完整页集合是该服务声明的address／已注册Kiosk／已发现token／capability union，不是全链所有收支。snapshot为服务SHA绑定（含未返回注册集），cursor为服务HMAC opaque continuation：客户端不能重算或拿共享secret，也不能转成原生cursor／自行证明签名。allAccountActivityCertified=false仍允许显示限定范围，永不因此生成全集ready；报告无client／签名权。原生SDL完整aggregate由NC5复用，不将file SDL代替运行自省。

默认探测总30秒（显式1–60000ms）、生产reader默认20秒及既有20行／100页保持。可选minimumCheckpoint只约束可用窗口，extension落后是syncing，不拿Fullnode当前height自动制造不可能的全集准入。HTTP／malformed／预算／coverage／changed明确分类，取消与迟到不得发布；scope不同、同profile新session与切网都重新探测。

只读profile03、正常工具CA、fixture.json内公开sender selector，仅输出其hash／文件摘要，不输出地址／业务bytes／账户列表或凭据。需要dev仍仅核验最新debug及契约仓原status，不restart／resume保护回放、不操作交易根，不沿用C9为新构建／Chrome。所有首次失败保留，原完整目标未完成前不勾父任务。

## H4a：真实上游503诊断后的错误合同补充（编码前）

[首次owner报告](./20261005-account-history-capabilities-public-owner-01.json)、[诊断01](./20261005-account-history-capabilities-diagnostic-01.json)与[诊断02](./20261005-account-history-capabilities-diagnostic-02.json)保持。诊断02只输出服务公共常量，证明HTTP200承载HISTORY_UNAVAILABLE／UPSTREAM_HTTP_ERROR／503且没有page；不应猜测gas或BCS字段不相容。目标selector的[诊断03](./20261005-account-history-capabilities-diagnostic-03.json)实际完整空页通过，0条只能证明该固定窗口声明union，不能证明非空事实或新发生资金已入窗口。

先保留[当前三份代码原字节](../evidence/20261005-account-history-capabilities-before-service-errors/manifest.json)，补服务官方扩展错误码安全白名单。仅单一合法GraphQL error的已审核code／reason／HTTP整数status允许分类：BUSY为繁忙、DEPENDENCY_UNAVAILABLE为依赖不可用、HISTORY_UNAVAILABLE的传输／超时／HTTP原因为上游不可用；SNAPSHOT_CHANGED／COVERAGE_CHANGED保持changed。未知／混合／畸形errors仍partial；任何errors都不得接纳data，不沿用业务内容、不自动重试、不扩大任何预算或将服务reason冒作客户端已验证错链。复核尾部原生已知错链仍优先。

新增实际源码sha及生产reader／capability／UI分类反例，之后使用相同profile与公开selector重新只读探测。若上游仍拒绝，保留真实失败及后续任务；禁止记为非空通过或trial_ready。

## H4b：真实包发布事实修复（编码前）

[诊断04](./20261005-account-history-capabilities-diagnostic-04.json)返回57838字节、5条真实非空事实，在history-facts的objectTypes规范化处失败；[诊断05](./20261005-account-history-capabilities-diagnostic-05.json)只返回枚举／类型类别，cp201271同时具有package与BCS PackageWrite。gas三值全部number，排除此前未获证实的gas猜测。

[固定Sui render源码](https://raw.githubusercontent.com/MystenLabs/sui/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-rpc-api/src/grpc/v2/render.rs)明确将ObjectType::Package渲染为package，Struct才渲染Move tag；[Sui effects-v2](https://raw.githubusercontent.com/MystenLabs/sui/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-types/src/effects/effects_v2.rs)的包输出是独立PackageWrite，版本独立于Move对象lamport version。当前RTD对应源一致，SDK只读parser原样保留类型；自定义服务引用原生transactionJson／effectsJson，不能伪造旧RPC DTO规避。原文及五当前本地源均已加入[权威manifest](../evidence/official/20261005-account-history-capabilities/manifest.json)。

[history-facts原字节](../evidence/20261005-account-history-capabilities-before-package-facts/manifest.json)保存后，保留全部tx／effects／events BCS与digest／窗口／顺序校验，先用receiptObjectEffects从已核验BCS提取输出状态，再规范类型映射。只有精确package且对应V2 PackageWrite才允许保留包标记；PackageWrite缺标记／伪称Move类型、普通ObjectWrite或删除状态伪称package、未知畸形标记均拒绝。V1未证明包判别继续拒绝package；此批不扩展全集、链执行权或包字节码权威证明。新增公开确定性协议夹具及缺失／错配反例，通过后原同账户实际完整reader再验5条；没有新交易或种子。

本批H1–4及H4a／b的编码与有限验证见[实施日志](./20261005-account-history-capabilities.md)；前表“待实施”为编码前原计划，最终状态以Task与日志为准。
