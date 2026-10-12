# F2c.2a／F3a–b：实际Provider持久负面重检与撤值设计

先保存[原字节](../evidence/20261005-network-admission-provider-before/manifest.json)与[当前状态](./20261005-current-state-before-network-admission-provider.md)，本页是编码前选定合同，不计完成。

1. store保持原capture精确合同，begin／complete只在原生事务complete后通知；通知只含固定version/type，不携带Fault／binding／账户／tx或授权。BroadcastChannel同storage key范围与同context订阅均只要求接收方重新读取native存储，通知失败不改变已完成事务。订阅离开关闭channel；缺BC仍每次IO前后重读、5秒轮询和focus/visibility重读。依据WHATWG broadcasting算法，消息队列／上下文关闭不提供持久证书，也不假设可靠到达。
2. 每session独立控制器从checking开始；从native capture重检得出有限blocked operations。身份Fault锁定本session并关闭signal；身份pending阻止所有新事实但保留会话以待真实观察完成；schema／ABI只影响依赖操作，余额独立于Display。存储失败全部新发布拒绝；已知负面不能由随后空行或普通正面解除。
3. 所有Provider方法及持有的asset reader方法在调用与返回前检查native行＋session／caller fence；本轮不新造普通reader观察ticket／Fault，不把empty行当H0或能力正例。后台真实F2c.1观察仍唯一已接入负面写入口；NC5四族观察协调另待，最终read/return竞争没有跨事务原子保证。
4. core新增有限操作撤值视图，读sessionKey保持原proof身份。查询键增加每操作短期撤值key；Hook在blocked／disabled／当前error时显式隐藏data及snapshot。QueryClient按wallet prefix＋binding＋session清理对应查询，不清其它binding／非链业务。dApp后台批准preview不因前端短暂checking／pending而被取消；完整批准旧值审计仍另待，不把本轮称所有UI已完成。
5. Provider原慢资产轮询、余额／metadata／staking独立快照不变；回切同profile新session，原记录保留。原journal只读恢复未改。验证实际React/QueryClient＋真实reader、控制流失败，另用隔离Chromium/native存储验证跨页／worker通知后重读；不会用harness冒作当前扩展或链上验收。

源：WHATWG HTML broadcasting to other browsing contexts：https://html.spec.whatwg.org/multipage/web-messaging.html#broadcasting-to-other-browsing-contexts 。此设计无新增Sui服务协议结论，沿用既有Sui／RTD冻结来源；完整NC5／发布pin与新扩展／core Chrome继续必需。
