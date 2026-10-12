# E6私有来源配对与UI防嵌入：编码前设计

接续[E3/E4/E5候选62项](./20261006-dapp-egress-protocol.md)。当前产品全局frame-ancestors none保持；本批先隔离Chrome候选验证来源/生命周期/UI边界，再与正式canonical库/产品写入点一起集成。父NET-04/TX-01/TX-10不由候选关闭。

[Chrome runtime官方合同](https://developer.chrome.com/docs/extensions/reference/api/runtime)中的MessageSender提供浏览器生成的tab/frame/document/origin；documentLifecycle是建立port时的值，不能假定它永远active。[webNavigation官方合同](https://developer.chrome.com/docs/extensions/reference/api/webNavigation)支持按documentId/tabId/frameId核对当前文档、父frame/document及生命周期。候选据此将extension gate自己的浏览器document与后台原content port的**父document**配对，不能把网页传入的tab/document/origin当权威。

候选后台为每个合法原content port生成256bit随机私有cap与sessionId。只沿原runtime port交付给isolated-world contentscript，随后由其对**指定extension gate窗口**发送init+单个MessagePort；cap不放URL/DOM属性/parent公开事件。gate只接parent来源、非opaque origin、一次init，然后沿自己的runtime port提交cap/session。后台必须同时核对自身extension sender身份、精确gate URL、当前gate document、相同tab、原父frameId/documentId、原content port仍有效和期限；不靠“都来自extension origin”接受任意UI/gate。

后台获批准的结果只沿gate runtime port交付ticket引用/固定binding，不经contentscript返回签名；payload留同扩展原生DB，继续strict消费→最后native同步parent.postMessage。初始化MessagePort仅控制配对/销毁，不向父网页公开秘密。超过预算、缺字段、额外字段、未知session/cap、跨tab/兄弟frame、迟到导航/断连、重放gate或worker epoch均拒绝。门槛仍不是账户/服务正面授权；候选只使用dummy，正式request/permission/account/profile/Move门槛接入仍待。

若放宽global frame-ancestors以允许gate，UI入口必须在导入任何privileged UI依赖前检查top===self：不符合则禁止加载bootstrap/连接/渲染；后台UI port另外检查精确UI URL、原extension id/origin及top frame来源，拒绝gate/embedded UI的同源冒用。最小webaccessible只gate.html；UI/CSS/JS不列为网页资源。先实测原C16 CSP拒绝与候选UI保护组合，禁止单独放宽产品manifest。

实际Chrome矩阵：普通/严格frame-src none/COOP same-origin页面成功private配对和单次dummy；网页消息监听/DOM/URL不出现cap；直接访问未公开resource拒绝；恶意init/伪造cap/兄弟tab/frame不能获得结果；UI top正常而child无bootstrap和后台UI权限；销毁/导航/断连先于最后native出口时0dummy/0重放。nativegetFrame当前lifecycle必须验证，不能拿创建时sender快照替代末检。注入harness拥有权限与正式产品支持要单列。

## 01–08实测修正与下一步合同

原01–02把documentId当36字符UUID错误；当前Chrome实际为32字符，按浏览器给出的有界opaque标识核对，不改写。05确认private init的source就是parent、origin正确且只有一个MessagePort，配对失败不是MessagePort跨origin问题。06–08逐项诊断确认：HTTP父document的getFrame存在且active；**extension gate的getFrame返回null**。因此上文“getFrame同时核对extension子frame/父document”的实施假设未成立，不能把候选当已通过。[Chromium GetFrame源码](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/chrome/browser/extensions/api/web_navigation/web_navigation_api.cc)包含navigation-state和URL过滤；其主干父document字段不代表已安装Chrome版本。

下一轮先验证[runtime.getContexts官方合同](https://developer.chrome.com/docs/extensions/reference/api/runtime#method-getContexts)：以后台浏览器给出的gate sender documentId/tabId/frameId/URL查询**当前活动extension context**，HTTP父document继续getFrame检查。父子秘密通道的归属还需两端挑战确认：gate沿自身私有runtime port收到一次随机challenge，只通过已经接收的私有MessagePort回传给原isolated-world content；原content仅接受自己创建的gate窗口建立的channel，沿原runtime port回报challenge。后台要求两个原native port、未过期session、exact gate document/current context、相同tab及原父document仍active共同匹配；不把网页声称的parentFrameId或origin作为浏览器事实。iframe parent关系不是getContexts字段，证据必须明确写成“浏览器身份＋两端私有通道挑战”，不得继续声称getFrame原生返回了gate父document。

挑战不能公开到parent事件、DOM、URL；只存有界短期后台内存，closed/超时/重复先置不可用，issue前重新核对两个当前context并拒绝导航。伪造cap、跨tab、兄弟gate和断连矩阵必须实测。当前仍未集成产品。另连续SQL观察02出现严格coverage一致性失败；保留失败，先只读检查每个字段和框架事务顺序，禁止手改水位或改为通过。

13轮首个有限通过23项：getContexts与双端挑战支持三类页面；未公开UI放到网页祖先下时由Chrome导航拒绝（12轮把这种拒绝错当UI guard失败）。因此分开验证：网页祖先下最小WAR实际拒绝；真实顶层extension UI创建自己的同源child，导航成功后由入口guard禁止bootstrap，再强制harness连接验证后台top-frame拒绝。后者是明确具有扩展权限的测试，不声称普通网页能执行extension代码。09隐藏gate使用默认requestAnimationFrame轮询超时、10提前读取未定义flag、11–12未公开UI导航超时均保留；13使用有界100ms轮询与导航事件先注册，未放宽资源清单。

下一批原生矩阵：攻击者权限普通网页只发送伪造init/访问资源；扩展harness额外尝试未知session、假cap、同tab兄弟gate、不同tab盗取一次性cap、缺/多字段与重复claim。测试cap仅存在fixture内部，绝不出现在证据JSON/公开parent事件。为验证尚未配对时盗取cap的更强攻击，harness暂缓原CS的private init，另一tab实际gate尝试，原source仍能随后正常配对；同tab另一gate即使拥有harness偷取cap也必须通过原CS创建的MessagePort挑战才可能配对，未确认时不能issue。拆frame/跨document导航/超时使context或原port失效；持久消费后的held dummy不得外泄。仅原生fixture通过后再正式集成。
