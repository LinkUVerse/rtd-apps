# RPC-01 对象点查合同核验（2026-10-04）

RPC-01接口编码与合同核验完成；Chrome页面操作仍由TRY独立验收。

## 权威裁决

Sui固定源码 get_object_impl 与当前RTD对应实现均将当前存储未返回对象映射为ObjectNotFoundError，并不返回“从未存在／已删除”的可靠分类。此前迁移映射表要求保留这两种状态的区别，超出了该接口的证据范围；双方现行04/03合同章节与08/07映射表已同步改为区分当前对象、NOT_FOUND、依赖失败，禁止由NOT_FOUND推断无历史或地址安全。冻结原文不修改。

依据：https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-rpc-api/src/grpc/v2/ledger_service/get_object.rs 。本地对应文件 rtd/crates/rtd-rpc-api/src/grpc/v2/ledger_service/get_object.rs。

## 实现核查

- 资产：useGetObject→WalletAssetReader.objects使用共同准入GraphQL快照，精确objectId和BCS／owner合同；缺项或错误不会伪造成合法对象。useGetNFTMeta消费新对象/display模型，查询失败不展示旧metadata。
- 收件人：useRecipientInspection→readFreshObject→WalletFullnodeReader.object，以明确read mask验证完整对象BCS、摘要、UID／版本、owner、类型和previousTransaction。仅真实NOT_FOUND返回null，响应缺object、坏BCS、错链或权限／传输错误拒绝；不查archive。无当前对象时风险提示另读账户历史范围与覆盖。
- 历史：readHistoricalEffect→readHistoricalObjects→WalletArchiveObjectReader，必须显式version，与effects的objectId/version/digest相等；未知状态或缺选择器不查询，绝不替换latest。单项复用已验证的归档批量合同。

## 实际证据

- 20261004-live-object-routes.json：配置profile03，同一0x5对象Fullnode当前版本14、GraphQL准入快照版本1、归档显式版本1，均通过真实wallet reader；0xdead的Fullnode当前点查为null，GraphQL资产点查为notFound。调用路径分别是Fullnode GetObject、GraphQL、Archive BatchGetObjects，无执行或JSON-RPC请求。版本不同是各查询职责及水位不同，不能混作同一当前状态。
- 20261004-object-routes-tests.log：fresh-object、recipient-hooks、asset-hooks、historical-effect共4文件61项测试通过，覆盖字段缺失、BCS完整性、owner变体、前后H0变化、NOT_FOUND／失败、历史effects绑定和hook显示。
- 本批未修改生产TypeScript逻辑，未重复完整构建。新探测脚本已实际运行；并非脚本独立类型检查或Chrome交互验收。

RPC-19的checkpoint与整体归档验收仍独立保留，RPC-23的其他风险提示链路也不随本条自动完成。
