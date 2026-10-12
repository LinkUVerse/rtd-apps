# E5/E6 产品私有出口：接入前拆解

E4 最新1090/444a0d20、47原生、2452全量/类型及5792/2009生产闭包已绑定。原dist C16、原钱包资料保持。本批先实现正式 native peer 与 gate 协议，再一次性接入实际 producer、request lifetime、content/gate/UI 与构建；不得提前放宽产品 CSP 或安装局部产物。

1. 正式后台 peer 从 Chrome 原生 sender 固定 id/tab/frame/document/url/origin/lifecycle；HTTP 顶层来源用 getFrame(documentId)，gate 用 getContexts 的精确 TAB/doc/url/origin。Chrome153 对 gate 的 getFrame 为 null，不能虚构 parentDocumentId。两条真正原生 port 加两端私有 MessagePort challenge 确认配对；cap 不进入 DOM/URL/父页面公共消息。所有 primitive 有界。
2. content 的私有出口原生 port 独立于旧业务 port；后台依两条原生 port 相同当前 document 精确关联，不能信 dApp 提交的来源。私有 init/challenge/ticket 绝不经 WindowMessageStream；旧消息代理拒绝任何带签名的 legacy 结果。每个来源最多一个活跃配对，worker startup 单次 epoch 由 E4 controller 提供，gate/UI 不启动。
3. peer 连接可覆盖3小时审批等待；握手/未确认资源仍短时有界，不能把 E6 fixture 的30秒 peer 误用于用户审批。已经配对不因30秒批准等待结束。只有最终结果的一次性 ticket 使用30秒以内 deadline；lease 必须在实际签名动作开始前捕获，捕获不能放到拿到旧签名之后。
4. Transactions 将原 connection/request 与内部批准 request 的原生绑定保持到最终 gate 完成/取消。producer 在权限/当前选中账户/锁状态/链/ABI 等既有授权完成之后、实际签名/执行之前取得私有 lease；raw signature 不进入 journal。每个 producer claim 一次；结果 ticket 必须使用该原 producer lease，不能重新捕获新 revision 来接受旧结果。
5. requestApproval 成功不能在 return 的 finally 提前 abort、删除 requestSignals、revoke prepared、去监听；ConnectionRequests.finish 也不能在取得后台结果后提前执行。成功保留到实际 gate post 的 acknowledgement；所有错误/断连/显式取消均关闭请求，不恢复 ticket 或重新签名/广播。已广播持久 journal 独立保留，通过既有恢复查询，不能因页面结果失败自动广播。
6. gate 只加载最小自有脚本并从私有通道获 pin/ticket。正式 canonical consume 严格 commit 删除 payload 之后，当前本 gate 一次 receipt 的最终原生 readonly callback 进行精确 origin 的同步 parent.postMessage。同步 callback 再检查本地关闭状态；完成后原生 acknowledgement 让后台结束整个 lifetime。共享负面状态/上下文屏障与最终 callback 以原生事务顺序为验收边界，不能声称跨进程事件无传播时间。
7. 产品全局 frame-ancestors 必须允许专用 gate 才能支持 strict-CSP/COOP 页面；因此 UI 首个独立脚本在 top!==self 时阻止 UI import，后台另核对真实自有 UI URL/current context/top frame。WAR 仅增加 gate.html，自有UI既有Banxa surface需单独评估；gate没有 UI bootstrap/连接能力。未全部组合前产品 manifest/CSP不改变。
8. 验证原生正反配对/盗cap/未知session/重复claim/UI祖先、source导航/gate拆除/取消/worker重启、真实签名延迟中的账户/网络/权限变化；真实 producer/原profile/7journal与当前产物逐字绑定。所有有限fixture、完整产品UI/来源授权、实链密码学证明分开记录；父58/98保持直到各父合同全部满足。

先保存 E4 当前状态/代码来源，再逐步实现。异常和原始证据留存，当前 CA 确认尚未获得，不改 Chrome 信任；共同业务 S 与独立发布声明仍待当前服务权威证据。

接入时确认旧 WindowMessageStream 只允许 event.source===window，故 candidate/raw listener 的最终 post 不能证明 Wallet Standard 实际收取。新增仅 in-page 模式的精确本扩展 gate origin/iframe WindowProxy 与浏览器 isTrusted 校验，配置 gate 后拒绝来自旧 window relay 的 sensitive 响应；实际 producer 接入前必须做真实原生消息流验收。普通账户/网络/错误消息继续既有窗口渠道。

[Chrome 官方 lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)明确空闲可终止 worker，单纯开 port 不能保证存活。私有 client 仅在真实 pending 请求期间每20秒发原生 heartbeat，并复验当前 source/gate，最后结果/错误/取消/关闭时停止；最大3小时仍是请求预算，不能把带调试器的31秒 fixture称为未调试生产长时存活证明。worker意外终止仍关闭配对、新代次作废旧 ticket，不自动续签/重播。
