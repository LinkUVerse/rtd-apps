# C126 对标官方的赞助授权结论

当前查阅的[Sui官方Sponsored Transactions](https://docs.sui.io/develop/transaction-payment/sponsor-txn/)要求sender和不同gas owner分别签署包含完整GasData的同一TransactionData，提交必须包含两方签名。外部费用方的sender单签返回只证明授权，不能算完整赞助执行。钱包单签提交拒绝保持；不将此规则与MultiSig密钥方案混用。

本地最新RTD `crates/rtd-types/src/transaction.rs` 的TransactionDataV1::required_signers始终包含sender，在gas_owner不同时另加入费用方。此本地定义与官方规则一致。本批所有业务输入只使用sender币/原仓位，费用方Coin只作为GasData.payment，避免把赞助资金用于业务分割；这是本批固定测试合同，不声明官方禁止所有GasCoin操作。

本次只读源检查与C124八debug来源保持，无重新编译或替换dev运行产物；两方完整执行和请求次数/恢复仍须后续实证，C126十二签名不能替代它们。
