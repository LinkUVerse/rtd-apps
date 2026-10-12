# 独立测试账户质押与待激活赎回实链验证

## 环境与前提

复用link-u-smart-contract的prepare_wallet_address_funding.mjs创建的独立测试账户0x11e90d…5f614。先扫描该账户已有pending文件，前序EDKY…Fhv8有Transaction成功回执且与fixture摘要一致；未使用仍有未知交易的deployer账户。

执行脚本每次重新核验runtime.ready、活动PID、指定rtd源码HEAD、全部dirty diff及changedFiles哈希、debug二进制路径和SHA256，与20261003-rtd-debug-reverified.json完全一致。环境没有启动或重启；Fullnode读取仍验证完整H0。使用保存的profile，不改端点，不部署新合约。

私钥仅从runtime私有0600文件读取，未打印或复制到文档。每次独立尝试使用全新目录，prepared、pending、receipt用wx写入并fsync文件及目录；pending落盘后单次dispatch，禁止重用目录自动重发。

## 质押

新增scripts/probe-execute-staking.ts复用真实WalletFullnodeReader／WalletTransactionReader／prepareStaking／revalidateStaking／WalletExecutionReader。测试质押1000000000原子单位（1 RTD），固定bytes复模拟与服务验签通过后单次提交。

摘要：5xhq79FPeApNJU5MnLemMSL721oSXx19xPRYHqSLsq6U，成功回执，dispatches=1。初次原摘要查询触发归档入口并因fetch失败中断；成功回执及pending保留，未重发。补充NODE_EXTRA_CA_CERTS后以新只读脚本probe-recover-staking.ts查询原摘要成功。

从成功effects的changedObjects读取当前对象并精确解码BCS，唯一StakedRtd对象98f62a…3b3d22，版本18，owner为测试账户，本金1000000000、stake_activation_epoch=3、pool_id=784847…5b92a3。此为非空当前对象证明，不是GraphQL同S持仓组合证明。

证据：20261004-live-stake-submit.json、20261004-live-stake-execution.log、20261004-live-stake-recovery.json及.log。

## 待激活赎回

只有上一步公共恢复证据的H0、sender、原摘要、成功终态和objectId一致才允许运行withdraw。继续使用实际准备器，从Fullnode新鲜读取本金与激活epoch，再模拟固定bytes、测试密钥签名、gRPC验签、单次提交。

摘要：24LB74KDmohgvpaqBTtSkLAjna7rqh2hc6zYb4JY7hcf，epoch2成功，dispatches=1；原摘要恢复成功。原对象当前点查null，新effects无新增StakedRtd，余额相较赎回前增加，最终999998617592原子单位。

证据：20261004-live-stake-withdraw.json及.log。两笔都是受控dev测试，均没有重发；私有原记录保留在staking-execution-01／staking-withdraw-01。

## 验收边界

这证明新钱包读写接口的质押和待激活赎回链路、非空BCS仓位、新鲜对象删除与原摘要恢复。没有等待跨epoch激活、未验证活跃仓位奖励兑付，也未验证GraphQL索引到达新仓位时的组合读取。签名来自独立测试密钥，文件日志不是产品IndexedDB；未执行Chrome批准或background账户签名。因此RPC-11／13及TRY仍待对应剩余合同，整体30/98、不可试用。

新增脚本通过实际tsx执行验证，钱包tsconfig不含scripts，不能将之前钱包tsc称为这些脚本的独立类型检查。生产代码本轮未改，未重复全量单测或构建。
