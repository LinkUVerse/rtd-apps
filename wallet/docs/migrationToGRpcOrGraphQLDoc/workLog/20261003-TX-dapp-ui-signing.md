# dApp批准页与只签名提交接入后台

日期2026-10-03；RPC-15／TX增量，执行分支未完成，整体不勾选。

批准页外层创建后台准备上下文，摘要、Gas和详情共用usePreparedTransaction的同一React Query数据和批准凭据。请求／账户／profile／UI读会话纳入隔离，后台只接受请求和账户ID，返回原文hash／origin需符合当前批准请求；信号取消后丢弃结果。后台独立readSession不要求等于UI会话。普通非dApp准备保持原query key。

批准动作必须有未过期凭据。Redux只签名分支改用background.signDappPrepared，使用原bytes映射旧消息桥transactionBlockBytes，移除该分支旧signTransactionBlock及Transaction重建。后台错误／过期都不回退旧signer；拒绝不签名。

新增7项测试：1项背景准备共享／token保留，2项批准携带token／过期点击阻断，4项真实redux thunk签名／拒绝／过期／后台失败。相关4文件21/21通过；首轮原普通query key精确断言暴露新增undefined项，已改为仅dApp扩展key并复验。完整钱包107条诊断，无新增直接诊断，不代表构建通过。见20261003-dapp-ui-signing-tests.log和typecheck.log。

执行模式仍使用旧signer；旧useSigner依赖、Qredo、多签、取消／断连与完整实际运行继续迁移。真实后台通信、Chrome扩展及链验收尚未执行，不能把mock单测描述为用户实测可用。方案5.4已同步重整两套当前状态；Task／totalProgress保持13/98，不可试用。
