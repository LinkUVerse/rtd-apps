# 最终dApp出口：实施前边界与原生存储验证

当前签名结果从后台返回后，经IPC/contentscript再执行window.postMessage；requestApproval的finally在此之前删除lifetime和prepared token。只将更多await后的检查放在background，不能证明最终页面出口与持久negative admission同事务。

[Chrome官方存储规则](https://developer.chrome.com/docs/extensions/develop/concepts/storage-and-cookies)明确：contentscript的IndexedDB属于宿主页面，不能作为扩展negative admission数据库；嵌入chrome-extension页面则豁免存储分区，可共享扩展top-level partition。由此提出独立扩展origin gate iframe候选，在真实最终parent.postMessage的同步调用处读取同一个原生IDB门槛。

先用私有隔离fixture验证普通与严格frame-src网站的加载、worker/页面/iframe实际DB共享、负面记录先提交后禁止公开dummy数据、宿主存储无法冒充扩展状态。没有账户、签名、交易或证书操作；通过只代表原生存储/出口原语。当前产品CSP frame-ancestors none、web accessible资源、固定消息source===window尚未修改。

产品实施前还必须设计一次性随机ticket、后台原始port的origin/tab/frame/document/request/account/binding与gate连接配对、导航/断连/锁定/切账户/切网失效、worker重启/过期/重复消费拒绝；ticket不得放URL/DOM或通过公开parent事件递送。实际门槛需要在同数据库控制上下文变更前预留pending，不能读取过时Account/NetworkEnv快照冒充同步授权。签名payload保持扩展内直到原生final callback；不做contentscript再次公开relay。

如果iframe被CSP或载入拒绝，候选必须明确失败，不能回退旧不具原子出口的发送。需要验证webaccessible/gate CSP变化不会开放wallet UI嵌入；考虑独立UI防嵌入及origin严格校验，不能直接删除现有限制并发布。完整来源、字段、负面竞态、实际Chrome验收后才集成产品；NET-04/TX-01/TX-10仍开放。

## 原生fixture实际结果（编码前进一步核验）

[03](./20261006-dapp-egress-native-03.json)Chrome153.0.8010.12实际exit0，fixture允许嵌入时，普通/严格frame-src none网站均加载扩展iframe；worker/扩展页面/iframe共享IDB，negative先提交后不返回公开dummy，宿主同名DB写false不能伪造扩展clear。[04](./20261006-dapp-egress-native-04.json)实际沿产品frame-ancestors none：两个页面均CSP拒绝，0公开dummy；probeCompleted=true仅代表观察完成，nativeSharedGateSupported/strictSiteSupported=false，不能称该政策下支持。

[05](./20261006-dapp-egress-native-05.json)实际保留frame-ancestors none、原生用户click打开webaccessible popup：普通/严格frame-src网站共享DB及negative守卫通过，COOP same-origin网站opener=null、0返回，coopSiteSupported=false。页面Console的CSP拒绝来自仍被注入的iframe，popup成功与该拒绝单列。因此popup不是可无条件替代所有页面的最终出口。

所有fixture零账户/签名/交易/证书变更，产品C16源与dist不变。01因安装Playwright默认cache1200不存在拒绝；02误等隐藏iframe可见而超时，均是harness失败且保留，浏览器/HTTP server在finally关闭。03/04旧harness字节分别保存为对应source.cjs.txt；fixture实际文件摘要与当前05脚本绑定，不能拿当前脚本SHA假称旧03/04执行来源。

## 接续原子出口实施约束

E3先定义同一原生扩展DB内的context/ticket协议，再接产品：字段包括不可推导的随机ticket、原始port origin/tab/frame/document/request/account/profile-binding、上下文revision、拥有gate document、TTL；None/未知/损坏/过期/重放均拒绝。后台批准签名不经contentscript公开；保留账户/网络/权限监听直到ticket交付或终止，不把requestApproval清理后的失效token复用为新授权。

E4必须在账户锁定/切换、网络及generation切换、origin权限撤销、worker新epoch等实际状态变更前提交原生pending/context revision，不能只在后置事件广播时更新。单独数据库的context与network-negative不能原子读，因此需同DB多store事务及兼容升级；原Fault/pending原文保持，旧版本拒绝/回滚边界必须留证，禁止为迁移清clear。门槛不增加正面服务authority，missing release声明继续degraded。

E5一次性ticket要先持久消费并移除签名payload，再在同一拥有gate内以最新context/network-negative的原生事务同步执行实际parent.postMessage；消费失败不能发结果，消费已成功但后续失败不恢复/自动重放。窗口毁坏/导航/撤权返回错误，原执行journal独立保留；不能以事后本地“sent”标记替代原生一次性消费。具体事务/abort后边界须用实际Chrome并发夹具证明。

E6若采用iframe，必须一起完成最小webaccessible surface、gate连接来源校验和所有钱包UI防嵌入；现有全局frame-ancestors限制不得单独放宽。改动要经实际当前UI嵌入拒绝、普通/严格CSP/COOP网站、伪造ticket/兄弟tab/frame、原生Fault在最终动作前提交、存储失败/超时/worker重启/取消后的结果0泄漏测试。

E7完成全量/类型、稳定C17与新production完整审计、当前原7journal恢复及实际签名验证后再集成收口；此前REL-01只对应源码稳定C16，产品源码改动后须重新核验最新生产产物。父任务不由这些fixture或设计关闭。
