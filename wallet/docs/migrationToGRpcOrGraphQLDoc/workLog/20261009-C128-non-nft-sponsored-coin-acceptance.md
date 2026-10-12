# C128非NFT普通币赞助执行及独立验收

原实施前合同保持。prepared01/independent02只读7原帧通过；fresh core01/02/03真实原524022七门，正式709569/pending null。原C124完整1122/原1456保护与29配置/14health/25actors/两H0/八debug/工作publisher运行保持。两枚业务/费用Coin原ref与归属同原批准payload，固定digest提交前NOT_FOUND，准备0sign/Execute。

executed01实际成功：复用C126普通币expirationNone真实钱包公开sender签名，新增一个dev sponsor同字节签名；ENABLED同字节模拟、双方原生VerifySignature通过；独占fsync pending和dispatch-intent后仅一个Execute。摘要HoAsQDsMkcByFVws1GnkKZ2pncRJceQbWWhDWAS2u5i5在1014706确认。第一次固定摘要恢复未找到，下一次同摘要成功；没有重广播。

[最终独立审核](./20261009-C128-executed-independent-03.json)：20原帧、规范TransactionData/Object/Effects全文与digest、实际Execute及确认Effects相等、两签/三Coin/owner/version/余额等式通过。sender总余额保持，sponsor实际gas2985880；业务Coinv2→3余额少1，新增self-owned Coinv3余额1，赞助GasCoinv1→3余额减少2985880。8修改gas/expiry/sender/amount的旧签名拒绝。[唯一广播独立检查](./20261009-C128-once-only-dispatch-independent-01.json)实际再次运行execute/prepare均预检退出1、未加载私钥或fetch、整个操作树SHA不变，新增sign/Execute=0。该once-only是C128外部操作合同，不冒充钱包完整M5。

首次独立prepare01拒绝Buffer/Uint8Array JSON形式差异，修正完整规范化后prepare02通过。execute独立01拒绝模拟原生可选顶层digest缺失；模拟原生缺失、实际Execute与确认必须具备顶层digest，完整TransactionData/effects摘要一直必需。独立02因保存Object原字节为Base64而错误按字符解析拒绝，v4显式规范Base64解码后03通过；完整wire/raw/body/type/owner/费用断言均保持。所有失败/source完整逆变换保留，0重新模拟/签名/Execute。readiness输出拼写、源派生命令cwd和首次文档命令UTF-8解析错误仅导致CLI失败，没有错误目录/产物；使用正确绝对路径和ASCII转义保存中文后完成，失败不计通过。

只接受普通币双签分支及唯一外部广播，不接受新的UI、钱包单签赞助入口、stake/withdraw双签、M5/完整一期/原父。其他11C126共享旧费用/业务引用签名不得提交。正式709569及当前消费者约560307低于本笔1014706，索引/归档效果仍待；名称原757805不降低。NFT专项第二阶段，原98为89完成，细分9.18%、trial_ready=false。0新容器/原链/indexer/publisher信号/元数据SQL写/卷镜像删除/Faucet/NFT业务。

依据：[Sui赞助交易规则](https://docs.sui.io/develop/transaction-payment/sponsor-txn/)要求双方签完整TransactionData含GasData；本地rtd/crates/rtd-types/src/transaction.rs的required_signers要求sender与不同gas owner。原生可选字段基于当前SDK executed_transaction.ts及实际保留原帧；共享BCS工具仅解析普通Coin。
