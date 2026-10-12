# 实链空 sender 修复合同

03 保留的实际 wire 在 checkpoint19850／事件0返回完整 Event BCS 的 sender=32字节零地址，GraphQL sender=null。当前 C18 reader 在 responseRecord(node.sender) 拒绝，不能将此前空事件小窗口通过扩张为非空事件通过。

权威依据：[Sui 官方 Event 文档](https://docs.sui.io/references/sui-api/sui-graphql/beta/reference/types/objects/event)声明 sender 可空、eventBcs 为完整原生事件；[官方实现](https://github.com/MystenLabs/sui/blob/main/crates/sui-indexer-alt-graphql/src/api/types/event/mod.rs)的 sender 在 native ZERO 时返回 None。此次另保存固定 commit 源码及 SHA；本地当前 rtd/crates/rtd-indexer-alt-graphql/src/api/types/event/mod.rs 同逻辑，使用既有最新 debug，无服务源码修改。

只在 node.sender 严格等于 null 且已经完整、canonical roundtrip 的 Event BCS sender 为规范零地址时，返回原生零地址。undefined、非零 BCS sender 配 null、结构化 sender 与 BCS 不一致均拒绝。零地址是系统事件原生事实，不伪造为交易发起钱包。其它 package/module/type/contents、固定窗口、事件序号、完整分页及最终 revalidate 保持。

修改前两个文件保存到 evidence/20261006-indexed-event-c18-before，产品 dist 仍 C18；新的源代码测试和 Node 实链结果不能自动替代旧 C18 的已安装浏览器证据。后续需要新产物及对应实际 Chrome 核验。父计数仍60/98。
