# TX-01：C20 实际 gas／赞助／有效期授权矩阵

实施前合同：父 TX-01 保持开放，66/98，trial_ready=false。

1. 只读复核最新 RTD HEAD／diff 与八个已安装 debug 字节。保持原 dev、原失败 profile、原 pending 和 Fault。
2. 保留现有 demo 源码及签名 harness 字节；新增仅 localnet／127.0.0.1 可用的完整交易 JSON fixture，拒绝跨域、错误 sender、缺失 gas 字段；运行 fixture／现代 Kit 定向测试，独立目录构建。
3. 新建独立随机账户，私钥／助记词／密码仅内存；每个新账户最多一次 Faucet V2 请求，先核对 Fullnode H0 和同链归档 genesis。不得重开原已注资失败 profile。
4. 普通／导入账户分别验证默认交易、显式完整 GasData 的 None 有效期、外部 gas owner 的未来 Epoch 只签名。逐项核对批准摘要、返回 BCS、sender、gas owner／price／budget／payment 与 expiration，验证实际签名和两次相同 BCS 的 checks-enabled 模拟。
5. 外部 owner 的单签 execute 必须拒绝；确认没有 Execute 请求，journal 前后完全相同。UI 显示赞助和未来 Epoch。只能声称发送方只签名，不能声称完成赞助双签执行。
6. 正常关闭前只读等待所属观察完成；保留所有失败证据。按父合同继续审核内部币／NFT／质押及 gas 变化再次授权，局部矩阵不自动关闭 TX-01。

权威依据：[Sui 官方赞助交易](https://docs.sui.io/develop/transaction-payment/sponsor-txn)，2026-10-06 本轮重新读取；[固定 transaction.rs](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-types/src/transaction.rs)。两方签署完整 TransactionData；本地单签执行入口的拒绝策略是当前钱包支持范围，不能误述为链不支持赞助。
