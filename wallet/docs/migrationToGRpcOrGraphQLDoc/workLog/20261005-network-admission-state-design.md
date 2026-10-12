# CAP6 F2a–b实施前合同：负面分类、观察占位与独立持久记录

本设计承接[F1a–b接口完成](./20261005-network-admission-view.md)及[F1–4细化](./20261005-network-admission-global-design.md)。编码前七份实际来源保存于[预审清单](./20261005-network-admission-state-pre-audit-01.json)，前一批64份当前来源逐字核验，[当前状态原文](./20261005-current-state-before-network-admission-state.md)保留。以下合同先实现纯状态／分类器，独立IDB与实际接入按后续子项推进，不能先记成持久隔离已实施。

## 负面与作用域

完整networkBindingKey作为版本1记录作用域，本profile revision／generation／入口／包组合之间不沿用正例；旧记录保留，无删除、TTL、清除或普通成功覆盖接口。受控新绑定的实际授权仍属于F1c–d／F2c–d；本纯合同不准许UI任意改revision解隔离。既有高度reset保持独立H0／generation作用域，不因新记录或revision绕过。

只分类真实NetworkIdentityError实例的四角色canonical错链／身份结构incompatible，影响整个绑定的新事实／新操作。完整生产能力报告先走本session投影合同，再仅分类GraphQL领域unsupported/schema及Move组unsupported/abi；影响对应领域／组。ABI未审核模板、kiosk-package、缺包、dependency、缺独立发布pin、package pin不同、预算、503、partial、syncing、changed与unconfigured不能伪造这三类已知负面。不解析错误message／服务器任意data、构造对象name或UI状态为权威。

Fault精确区分identity(role, reason)、graphql-domain(domain, schema)、move-group(group, abi)，只存有限公开枚举。identity任一角色负面阻止本绑定新操作；领域／组仅阻止声明依赖它的操作，Display负面或观察中不阻止独立balances；只读原journal摘要恢复例外尚未接入，必须沿原scope与独立H0，不授权新构建／模拟／签名／Execute。

## 观察前占位，避免失败写入后忘记负面

不能仅在发现负面后写一行：如果写入abort／不可用而原记录不存在，新会话会把空记录误当成可重新授权。因此观察开始前，先strict提交对应area的pending ticket；提交前没有网络IO或新授权。完成探测后同一事务重读当前记录，合并Fault、只移除本ticket，不修改其它观察或既有Fault；正面只完成自己的占位，不能清除已有负面。

pending identity阻止整个绑定；pending domain／Move组仅阻止依赖该area的操作。不重用旧报告或用计时器／普通后来成功删掉pending。观察失败后的pending必须保留，F2b具体IDB实例只能接受自己发出的原对象ticket，首个完成决定锁定，负面完成写失败不能被改为正面再试；重启／其它实例没有原观察所有权，不能补造成功完成旧ticket。未完成观察保守阻止对应scope，明确与“已确认错链”区分；受控重绑归接入层。

## 精确记录与预算

根仅schemaVersion=1、bindingKey、faults、pending。binding UTF8≤64KiB，整个normalized JSON≤128KiB；fault最多28种：4角色×2身份原因＋8个领域schema＋12个Move组ABI。pending≤32，每ticket精确id／areas，id为小写UUIDv4、areas非空≤24种；重复area／ticket／fault拒绝。持久数组按公开key规范排序，不接受未知字段、非法enum、其它绑定、缺字段、非canonical顺序或额外payload。所有命令输入复制／验证后deep freeze，不能让调用方后续修改原参数改变存储决定。

纯reserve／complete必须用于存储事务内部当前值，不能拿此前内存snapshot覆盖并发记录。complete只接受原ticket的相同areas，所添加Fault必须属于本观察area；并发其它负面保留。无匹配负面仅是此项检查未拒绝，不产生ready、签名许可或reader客户端；业务入口仍新查H0、事实及持久状态。

## F2b独立IDB与权威原文边界

后续新库与journal／已有NetworkObservations库独立：version1、单固定object store／精确keyPath，无自动旧库迁移。写操作请求durability strict并检查属性，只有transaction complete才算占位／完成已提交；open阻塞、升级异常、缺API、corrupt、abort、超时或strict不支持均明确拒绝。open与事务均使用同一≤5000ms总期限；超时立即拒绝、尝试abort、关闭迟到db，迟到success／complete不能发布成功。源头故障即刻阻止当前操作，跨context消息只是撤值通知，接收方必须重读记录；最终发布／授权的并发竞争仍须F2c实测，不能把纯状态或Web Locks叫服务端fencing证书。

[W3C固定2025-08-13工作草案](https://www.w3.org/TR/2025/WD-IndexedDB-3-20250813/#transaction-durability-hint)将strict定义为durability hint；本钱包采用“请求strict／检查属性／等待complete”的更严格接纳政策，不声称符合该策略就已证明物理断电持久性。原文及七份本地来源的SHA见[固定来源](../evidence/official/20261005-network-admission-state/manifest.json)。实际Chromium事务／并发／重启证据及物理故障边界归F4，不用单测假IDB或纯模型替代。

## 本轮子项与验证顺序

1. F2a.1：有限area／Fault、精确记录、单调合并／pending占位／匹配拒绝的纯合同。
2. F2a.2：生产报告／真实错误类分类，不把瞬时失败或缺部署签认持久伪造为错链／ABI。
3. F2a.3：实际SDL／SDK四族fixture正例及schema／ABI反例、跨binding／session、canonical／预算／并发合并的单测与全量／类型。
4. F2b.1：独立strict IDB、先占位后IO、原观察所有权／完成决定、同一deadline与异步事件故障。
5. F2b.2：原生Chromium多实例／跨context／abort／升级／迟到／完成／重启，正面不能擦除Fault／失败占位；journal保持独立。
6. F1c–d／F2c–d／F3：Provider与后台实际门槛、最终发布竞争、关闭会话／撤去reader及准确cache、旧摘要恢复例外；新构建／完整核心Chrome及试用父门槛仍开放。
