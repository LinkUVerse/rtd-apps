## 2026-10-07：默认解析有效期与显式 None／Epoch 必须分别核验

未设置 expiration 不能等同于最终交易没有有效期。Sui SDK 2.0 的[官方迁移说明](https://github.com/MystenLabs/ts-sdks/blob/main/packages/docs/content/sui/migrations/sui-2.0/sui.mdx)描述默认解析会使用有界窗口；无有效期须显式指定 None。[官方 transaction.proto](https://github.com/MystenLabs/sui-apis/blob/main/proto/sui/rpc/v2/transaction.proto)同时定义 ValidDuring 和带 allowedProposers 的 Validity。上述 main 链接于2026-10-07核对，不能把文档的概述当作所有版本及节点配置下唯一默认值。

[Sui 当前模拟源码](https://github.com/MystenLabs/sui/blob/main/crates/sui-rpc-api/src/grpc/v2/transaction_execution_service/simulate/mod.rs)在节点能够提供有效提议者集合时可生成 Validity，否则保留相应无提议者限制的行为；该上游版本还要求协议及客户端能力满足其兼容门。当前本地 RTD latest debug 源 configure_transaction_validity／restrict_transaction_proposers／select_allowed_proposers 及 SDK transaction-resolver 的实际行为须以所运行版本核对，不能仅凭上游 main 声称二者实现完全相同。

本轮当前 C46 真实普通／导入账户的默认解析实际返回 Validity：minEpoch=1、maxEpoch=2、chain 为本代 H0、每笔保留独立 u32 nonce，并携带委员会 epoch=1 的 proposers=[0]。另两组显式完整 GasData 的 None 与赞助未来 Epoch=2 也保持正确；不得为了审计方便把默认解析窗口改为 None。批准依据仍是最终 prepared BCS，完整窗口、链、nonce、提议者集合、sender 和 GasData 必须进入同一签名及两次相同 BCS 的正式模拟。能力不足或结构未知须拒绝，不能删除限制字段后继续。

[实际 Chrome 02](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261007-C46-current-authorization-matrix-chrome-02.json)102项检查，4个人消息及6交易签名、14次 ENABLED 模拟、0业务Execute。[独立审核02](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261007-C46-current-authorization-matrix-independent-02.json)逐项验完10签名、14原模拟帧、12规范完整effects、2真实gas选择、36补充原生帧及fresh委员会／gas对象。三journal保持、正常重锁、自有Chrome退出及1015原私有文件保持。审核01因错误地要求默认 None 而失败，原记录保留；修订02新增完整 Validity 与原选择响应及fresh委员会索引核验，未重跑签名、模拟或注资。

显式赞助 sign-only 仍保留完整外部 GasOwner；当前钱包单签 execute 入口在准备前拒绝。此限定当前授权矩阵不代替完整 NFT／全入口竞争／链上执行／普通 Chrome TLS 或父 TX-01 验收。
