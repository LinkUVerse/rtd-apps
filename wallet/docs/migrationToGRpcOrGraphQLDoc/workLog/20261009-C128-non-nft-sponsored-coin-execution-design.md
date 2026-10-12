# C128 非NFT赞助转账实际双签执行

实施前合同：基于C126当前C124生产Wallet Standard已真实批准、独立核验的coin/expirationNone唯一公开sender签名，对已批准完整bytes再由既存dev sponsor签名并执行一次；不重建/修改payload、不重新用sender私钥签名、不伪造钱包ticket或复活30秒结果租约。该租约管钱包结果交付，已交付的sign-only签名按交易本身expiry执行。其余11已交付签名不提交，共用对象在本次写入后必须另行重新预览/授权。

Sui官方赞助规则要求双方签同一完整TransactionData含GasData；当前RTD required_signers也要求sender与不同gas owner。资金是受控G3开发链已有dev Coin；本笔自转1最小单位、sender业务Coin/独立sponsor GasCoin，gas预算100000000。原26NFT/cap等不作为业务输入，规范effects必须全部Coin。钱包单签执行入口继续拒绝外部gas owner，不能因外部完整双签可执行放宽钱包单签入口。

prepare仅当前全1122/生产graph/原1456与29/14/两H0/八debug/actor/publisher保护及fresh524022七门/完整源检查、原批准sender密码学验签和两最新Coin完整BCS/ref/owner、同H0服务身份/资产原生余额；0私钥签名/Execute。execute重新核对所有prepare source/pin/真实完整当前运行、原生引用及ENABLED同byte模拟；仅读取既存sponsor dev key，签同bytes并本地/原生验双方。

发送前fsync唯一pending及dispatch-intent到私有目录，CLI和网络计数唯一Execute。任何异常不重发，仅按固定digest LedgerService.GetTransaction只读恢复，原始错误/响应保存。执行后完整TransactionData/Effects规范BCS/digest/status/同byte两签、sender业务Coin引用与赞助gas对象变化、native余额及实际gas费用等式逐原帧独立核验。历史签名是在C126真实页面发生，不冒充本轮再次UI操作；本合同只收口普通币这一赞助执行分支，stake/withdraw/单签拒绝UI/M5/全部一期/原98父继续。

0Faucet/新Docker/原进程信号/原库重置/metadata直接写/NFT业务；资料/实施/失败/恢复/进度放workLog。使用既存最新RTD debug和localDeploy控制开发环境。官方来源：https://docs.sui.io/develop/transaction-payment/sponsor-txn/；本地源码rtd/crates/rtd-types/src/transaction.rs required_signers。
