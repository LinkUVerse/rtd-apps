# E3/E4/E5候选编码与真实原生协议验证

按[已有实施约束](./20261006-dapp-egress-design.md)接续编码；98项父计数不变。新代码为 `scripts/candidates/dapp-egress-store.cjs`，构造器强制隔离 `RtdWallet NetworkAdmission:test:egress-*` 命名空间，拒绝产品数据库名。当前产品C16/manifest/CSP/dist未变，候选不属于已安装生产入口。

原生DB v2保留 admission-v1，添加 context/ticket 两store，严格验证布局；升级不扫描/改写原Fault/pending。旧v1读者VersionError拒绝。新worker epoch使旧票据失效并删除其私有payload，但保留中断的context pending；没有TTL清除已知Fault/未知状态。候选negative门槛保守阻止所有非空fault/pending与缺行，不提供正面服务权威；正式集成须复用当前profile/canonical admission验证器及精确作用域。

后台批准前捕获不可序列化、实例私有WeakMap lease，绑定原origin/tab/frame/document/request/account/profileBinding/gateOwner与epoch/revision。issue只允许该lease一次，严格与最新原生context相等，不允许切换完成后给旧批准自动绑定新context。256bit随机ticket，最多64持久条目，payload限128KiB、全部生存期限至多30秒；正式批准TTL及事务BCS输出模型接入仍待。输入精确字段/类型/预算，不接收getter、额外字段、短地址/不规范origin等。

gate先在strict readwrite事务中核对绑定/context/negative及时间并持久删除ticket/payload，oncomplete后才获得私有不可序列化receipt。最终readonly事务读最新同DB context/negative，在最后一个原生read success回调里同步执行实际parent.postMessage；receipt调用前即销毁，任何失败都不重放。只在可信代码内部接受同步回调，async callback在调用前拒绝；不是向网页开放可执行回调接口。

候选mutate先strict提交revision/pending后才调用外部状态写入，成功后仅完成自己的pending；Chrome.storage/Dexie可能已部分提交，异常或完成存储失败均保留unknown pending。并发mutation互不清除；跨worker旧token无法清除新的epoch内未知状态。当前真实Chrome.storage写入已有限验证，产品NetworkEnv、账户/源/临时密钥、权限、自动锁、迁移/清钱包等写入点仍未接入。

## 实际执行和修复

使用真实Chrome153.0.8010.12、私有新extension/profile，真实extension worker/iframe共享IDB，真实strict CSP+COOP父页面dummy post，无TLS绕过/CA变更、账户、签名或交易。初版[01](./20261006-dapp-egress-protocol-native-01.json)30通过；扩展[02失败原log](./20261006-dapp-egress-protocol-native-02.log)观察到onblocked拒绝后关闭旧连接，迟到onupgradeneeded未abort导致schema版本升高。修复为无论是否已拒绝，都中止新产生的upgrade事务；[03](./20261006-dapp-egress-protocol-native-03.json)48通过。

[04](./20261006-dapp-egress-protocol-native-04.json)55通过，加入批准前lease/revision拒绝、序列化/实例借用/重复lease及async callback拒绝；[05](./20261006-dapp-egress-protocol-native-05.json)最终当前候选62项actual exit0，加入真实Chrome.storage屏障、局部外部失败保留、并发mutation只完成自己，以及最小webaccessible gate.html。最终11公开dummy均为明确正例，所有负例0额外dummy。故障注入覆盖真实native abort-after-delete（0receipt/未公开）、64并发容量、两consumer仅一winner、原负面行逻辑字节保持、过期/回拨、坏context、持久消费后新Fault/context/epoch拒绝。未将fixture source端口或dummy视为钱包密码学授权。

01/02/03/04每次执行的candidate/launcher字节均保存为对应 `*-candidate.cjs.txt`/`*-launcher.cjs.txt`；02无成功JSON，保留实际exit1日志。私有每次fixture目录保持。当前05 proof输入摘要必须等于当前脚本/候选，历史JSON则对齐保存源和各自实际extension字节，不拿最新SHA代称旧执行。

## 正式接入前剩余工作

E3仍须正式同DB兼容升级/全canonical negative与profile绑定、真实批准payload/TTL和原库/回滚审计；E4仍须所有产品变更点前屏障及request lifetime维持到交付；E5仍须通过后台原port/gate私有通道交付，payload不能经过contentscript/URL/DOM公开事件。E6须UI最早bootstrap防嵌入、后台UI sender拒绝、最小webaccessible、父origin/source/gate配对、导航/断连/毁窗竞态；目前全局frame-ancestors none依然生效。E7须全量/类型/C17/当前production/原七journal/实际密码学与完整父合同。NET-04、TX-01/TX-10保持未完成。

## 当前环境观察

[02:19:01只读SQL投影](./20261006-egress-sql-observation-01.json)原22管线最低437220，Display从0连续推进；native窗口此前586007。这是带时间的观察，不是共同S或业务试用通过。所有原链/journal/pending保留。
