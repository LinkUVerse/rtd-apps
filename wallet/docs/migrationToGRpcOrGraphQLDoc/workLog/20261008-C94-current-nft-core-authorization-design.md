# C94 当前独立 NFT 最终字节与授权核心矩阵

实施前合同，2026-10-08，对应 TX-01 与 C93 P93-5 的内部 NFT 全矩阵推进，不降低全部四类、Provider／实际 Chrome、live lock／durable journal 或双签执行父合同。C93 新库存 checkpoint687127 尚无正式快照，Kiosk 必须继续等待；不能用 native oracle 伪造 asset snapshot。本批使用 AddressOwner direct NFT 的真实原生准备分支，产品源不修改。

- P94-1：封存 C93 六份当前文档，核对 C93 完整绑定、C92 ownership、当前源／debug／29容器14健康25actors／原1456保护文件。输入为 C93 新 source、existingTarget、sponsor，原六笔／原账户只读。
- P94-2：调用原生产 prepareNftTransfer／revalidateNftTransfer、WalletFullnodeReader／WalletTransactionReader，真实 direct 最终规范 TransactionData、GasData、expiration、ENABLED simulation、digest 与 session 固定。相同 bytes 复验必须返回同一 prepared 对象；Gas预算／收款方／expiration 变更的 cloned bytes 即使模拟成功，也必须被原 digest 授权拒绝。sender／binding／readSession／已取消在 IO 前拒绝。所有成功模拟回复都保留完整请求、protobuf、BCS、effects和响应 headers／trailer；不替换服务响应。
- P94-3：新 sponsor 真实 fresh gas ref 加入同一 NFT 转移的新交易，使用生产 TransactionReader 准备／模拟，完整 sender 与 gas owner 分别对同一最终 bytes 私有签名并本地独立验签。证明变更后的 bytes 不能使用旧签名；当前产品 unsupportedSponsorExecution 的执行边界继续拒绝，sign-only 允许。本批零 Execute，不能宣称双签执行或实际 UI 授权完成。
- P94-4：独立解码所有实际原始帧、最终 GasData／expiration、改变摘要的拒绝、原签名，完整新八NFT／五cap和原十三／policy保持；明确 reader/core组合不能冒充生产 Provider 中 native lock／IndexedDB guard 或浏览器批准。全四类、有效期负面、真实双签执行及父 TX-01／TX-04 继续。

零新合约、Faucet、Docker、服务信号、SQL／object写、原签名profile或普通Chrome敏感页操作。输出私有文件0600，密钥不进入日志／参数／控制台。任何失败保留原工具与输出，修复用新版本／新证据，不改已 sealed 源或重发 seed。新署名只用于本批本地授权核心证据，不提交链。
