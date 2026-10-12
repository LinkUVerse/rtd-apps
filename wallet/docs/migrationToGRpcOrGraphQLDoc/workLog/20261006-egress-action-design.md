# 正式 producer 接入前合同修正

基线1097源码21c29a76、175文件2480全量及typed transport原生33项通过。所有受影响源字节先保存在 evidence/20261006-egress-action-before/manifest.json，旧结果仍绑定旧源，不能冒作修正后的证据。

1. 在正式 store 增加 runBeforeAction：opaque lease 保持同一 epoch/revision，签名与实际 dispatch 各最多一次；在共享原生 readonly 回调同时检查 pending、期限和负面记录后同步调用实际动作。异步动作不持有IDB事务。业务权限/ABI/身份核验仍必需；先既有 Move runFinal，最后以内层上下文检查启动动作。最终出口拒绝不能撤销已广播交易。
2. 依赖域由后台实际 producer 根据固定交易推导，不能接收 dApp 自选域。新capture可显式传可信依赖域；未传时保持旧全域拒绝。复用 canonical assertNetworkAdmissionClear，全部 identity fault/pending 始终全局阻断，GraphQL/Move fault 仅阻断匹配域。PersonalMessage 显式空域，保持05章“不依赖归档、索引或交易gas”；缺负面记录、腐败库和上下文pending仍拒绝。选择随lease/ticket固定，不能交付时重新选择。旧schema1 ticket不按新schema接受，worker新epoch会清除旧临时ticket，原admission Fault/pending保持。
3. 响应总预算调整为2MiB，最多64个持久ticket，完整JSON含base64及签名严格检查。消息原输入最多1MiB，编码后约1.4MiB，能在新总预算中返回；交易BCS仍由既有批准验证限制。单字段和完整信封均有界，拒绝不能触发重签/广播。2MiB是本钱包资源政策，不是Sui协议值。
4. HTTP原生来源以同tab/frame/documentId、active生命周期和同origin判定；同document的history.pushState允许路径变化，新document/cross-origin拒绝。gate仍精确自有URL及getContexts身份。后台捕获业务sender需同document/origin，不使用过期路径作为身份。

权威核对：[Sui官方Wallet Standard源码](https://github.com/MystenLabs/ts-sdks/blob/main/packages/wallet-standard/src/features/suiSignPersonalMessage.ts)要求返回已签原消息base64和signature；[官方Signer源码](https://github.com/MystenLabs/ts-sdks/blob/main/packages/sui/src/cryptography/keypair.ts)使用PersonalMessage Intent/BCS向量并返回原bytes，不能通过截断响应规避预算。依赖域与2MiB上限是本项目合同，不声称上游规定。Chrome消息JSON规则见[官方文档](https://developer.chrome.com/docs/extensions/develop/concepts/messaging)。

先验证真实IDB动作前拒绝/同lease一次性/域隔离及1MiB完整响应，再接实际producer、审批lifetime与产品入口。父58/98保持，原dist/profile/journal不操作。

真实 producer 的最终已验证结果封存在后台内存，关联内部审批ID、原生业务sender、公开请求ID与旧lease；审批消息只能确认该后台结果，不能以UI传回的任意bytes/signature替换。最终publish必须使用封存信封。requestApproval的finally延后至native交付ack/失败，原有连接、signal、网络/账户监听同步保持；恢复查询不触发签名/广播，也须在当前批准关联中单独捕获并封存已验证回执。

Chrome153工具栏action popup的真实sender只有自身id/origin/url，不含tab/frame/documentId/lifecycle，native getContexts才包含POPUP/frame0/tab-1/contextId/documentId。03失败原始观测保留，不能虚构sender字段。无tab的UI严格限定自身ui.html、唯一当前POPUP，先记录native contextId，再在同一原生业务port发私有一次随机挑战；顶层UI PortStream回应后，再读getContexts且要求同contextId/documentId。嵌入UI不回应且native TAB/frame>0拒绝；旧popup关闭或替换的context不能借相同URL接收旧消息。验证前只允许16条/128KiB消息缓冲，2秒原生检查和5秒挑战有界，无特权handler运行。普通顶层TAB仍核对sender的原生doc/frame/lifecycle。
