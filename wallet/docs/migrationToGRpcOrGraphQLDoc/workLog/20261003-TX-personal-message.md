# PersonalMessage后台授权与签名迁移

日期2026-10-03；TX增量，真实签名与环境验收未完成。

消息批准页和redux转signDappPersonalMessage，不再调用旧WalletSigner，也移除其useSigner／旧Qredo提交hook。后台取持久请求及live connection，核对原消息base64、账户、origin、有效期、当前权限和锁定／选中状态。签名前同步登记请求占用，重复批准不重签，签名异常也不自动再签；连接结束释放占用。监听账户生命周期并在所有异步边界复核授权，断连／撤权不能返回迟到签名。

PersonalMessage Intent包含BCS vector<u8>，返回原始消息base64。普通签名使用SDK实际本地密码学验签，不读profile或网络。zkLogin通过WalletExecutionReader新增PersonalMessage路径验证，复用Fullnode完整H0／水位及取消边界，使用name=PersonalMessage,value=BCS vector。已核对当前rtd/crates/rtd-rpc-api/src/grpc/v2/signature_verification_service.rs 54–61行，服务端反序列化字节切片后计算PersonalMessage signing digest。

新增9项：7项后台请求与实际Ed25519验签（Intent精确字节、重复、原文变化、撤权、断连、错误消息签名、过期），1项gRPC请求BCS契约，1项真实redux消息分支。相关4文件44/44通过；完整钱包仍100条类型诊断，无新增模块直接诊断。日志为20261003-personal-message-tests.log与typecheck.log。

未做真实zkLogin／多签／Qredo／Chrome签名或实链验收。尚需清理其它旧signer调用、补原摘要恢复结果、所有剩余RPC和指定debug环境核心测试。当前不可试用。
