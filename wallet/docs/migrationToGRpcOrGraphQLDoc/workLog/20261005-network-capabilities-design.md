# NET-04 CAP5：schema、能力与覆盖聚合实施前设计

主合同为[网络方案](../06-网络缓存分页与插件边界.md)2.2；CAP1–CAP4已完成有限范围，NET-04父项仍开放。先记录子任务再编码；本批不得把同链身份或schema声明当完整网络ready，不测试模拟／执行能力时发起模拟或真实交易。来源见[官方原文及摘要](../evidence/official/20261005-network-capabilities/manifest.json)。

| 子项 | 编码前状态 | 交付与验证 |
| --- | --- | --- |
| NC1 | 待实施 | 原生GraphQL完整自省，按当前reader的真实字段／参数／类型／fragment验证查询合同；完整H0／binding／session fence，响应预算与公开固定失败；新增反例与真实同链只读探测 |
| NC2 | 后续必需 | 各领域独立coverage与snapshot proof聚合，Display能力basis保持，schema支持不等于管线已同步；完整NFT不能用balances替代 |
| NC3 | 后续必需 | native服务实际只读正例及部署声明，packages／registry／函数与BCS布局合同；不通过不存在对象null证明方法支持，不自动模拟／执行 |
| NC4 | 后续必需 | accountHistory独立chain／scope／窗口digest／证书旗标与reader合同；受限协议不要求原生GraphQL自省，不把扩展schema冒作通用schema |
| NC5 | 后续必需 | 有界、全部已配置入口的聚合报告，过时会话与已知错链优先，角色降级具体呈现；与CAP6全局状态接入后才发布完整活动client集合 |
| NC6 | 后续必需 | 最终构建／闭包与新实际扩展核心链路、原journal只读保护、双方文档与进度同步，所有失败保留 |

## NC1合同

本地SDK依赖GraphQL17.0.2已有离线产物；钱包新增同版本直接依赖，不修改只读SDK或RTD源码。用参考实现getIntrospectionQuery／buildClientSchema／validate；不手写宽松字段存在校验器。schema深层字段、参数、枚举输入、union fragment、必填参数不匹配均不得放行为该查询合同兼容。只检查本批明示查询合同；尚未入清单的reader路径继续补齐，不宣称全量闭包。

完整自省和H0在同次原生GraphQL请求中读取，SDK客户端只在探测内部存在，不返回执行客户端。完整errors／data/schema与H0核验，拒绝HTTP失败、部分响应、不兼容自省、错链、超预算与结束时失效会话。只返回冻结的schema摘要、版本、验证时间、session绑定和具体查询合同结果；不保存schema到跨链持久查询缓存，不使用上次成功值掩盖本次失败。每次探测重新发请求，redirect:error、credentials:omit、有界abort与读取并发预算。

单次至多10秒（允许显式1–60000ms），响应体至多2MiB；无重试，不自动调用模拟、提交、账户history或默认MVR服务。不存在GraphQL入口返回unconfigured；schema合同成功状态命名schema-compatible／schema-degraded，禁止命名wallet ready。自省被部署关闭时返回明确不可验证，不改服务配置或拿文件SDL冒充运行时自省。

## 真实前置事实与失败

[前置01](./20261005-network-capabilities-prerequisites-01.json)原生GraphQL实际HTTP200，Query／ServiceConfig自省含availableRange与Display扩展。accountHistory检查器遇到data:null后错误调用items产生AttributeError；它是检查器失败，不是业务故障。[02](./20261005-network-capabilities-prerequisites-02.json)保存实际200＋BAD_REQUEST＋data:null。当前account-activity/graphql_api.py明确只允许accountHistory／accountHistoryCoverage一个根查询，所以不照搬原生自省；NC4采用该实际合同。全部只读、0模拟／0签名／0提交，受保护回放不重启／resume。

运行安装包仍为已验证C9产物；NC1代码开始后它属于上一批稳定包，新源码通过不等于新包Chrome通过。源码／产物最终证据在NC6再独立建立，49/98、trial_ready=false。

## NC2编码前补充

余额、metadata、staking、完整assets、names、sent transactions、events-by-type、events-by-module分为独立领域。复用各实际reader coverage数组和GraphQLSnapshot.open的H0／范围交集／pin／Display验证，不写第二套宽松水位判定器；每一领域仅返回snapshot声明proof，不能当已有业务对象或可签名输入。staking的multiGet合同单独保留无Display字段，避免完整NFT Display缺口阻断独立staking。names未配置返回明确unconfigured，不填默认registry。

先完成NC1，再在同一总期限中执行schema及各领域独立轻量准入；schema不兼容领域跳过读取并明确unsupported，其他领域照常检查。全部已配置领域逐项报告，已知错链优先于临时不可用，结束时绑定失效／caller取消禁止发布；取消不提前释放忽略abort的底层读取名额。超时／取消可结束调用，底层迟到结果不发布。默认总期限30秒，不逐领域重置期限或刷新已有成功缓存；无模拟／签名／Execute。NC3、NC4、NC5全局client／UI接入与NC6最终产物仍开放。

## schema合同末审补充

191定向及145文件1709项首次全量、完整钱包与脚本类型已实际通过。末审仍发现必须补齐两个协议语义：InputObject oneOf约束和参数／input默认值。仅type与required相同不表示原有查询语义不变；availableRange.filters的默认值变化尤其不能静默接纳。启用当前服务器支持的oneOf与deprecated input／args完整自省，按参考实现AST记录默认literal并比较oneOf；增加反例后重新生成审核基准与验证，不把首次全量推为补充后源码通过。
