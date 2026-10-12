# dApp后台固定bytes只签名

日期：2026-10-03；TX与RPC-15增量，整体不勾选。

从准备器提取withAuthorizedDappRequest，准备和签名共用持久请求／有效期／当前权限／账户／profile边界。新增signDappPrepared，只接受请求、账户和批准token，拒绝execute模式；从内存登记消费原bytes并独立校验摘要。在同链同账户Web Lock内检查journal pending，正式模拟原bytes，再以TransactionData Intent签名和验签。每个签名相关异步边界重读授权，撤权后不返回签名。此命令没有dispatch或重建gas，返回现代bytes／signature。

命令已接origin受检UiConnection以及BackgroundClient。13项新增测试：11项后台真实BCS／摘要与受控签名边界，2项客户端通信；相关5文件55/55通过。测试中的锁、journal、模拟、签名和验签服务为mock，不能当作真实节点、硬件签名或Chrome证明。已有执行协调器和准备器测试同时通过。完整钱包107条类型诊断，新模块和测试无直接诊断；不是完整构建通过。证据：20261003-dapp-signing-tests.log及typecheck.log。

尚未完成批准页／redux的旧signer替换，执行模式、赞助多签、Qredo、断连失效与真实运行验收均保持未完成。下一步将后台预览凭据接页面，并增加一次执行现代结果映射。当前不可试用；未启动dev或部署合约。
