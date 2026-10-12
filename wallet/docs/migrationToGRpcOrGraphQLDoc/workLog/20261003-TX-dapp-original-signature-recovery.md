# TX-04／07／11：dApp原交易签名恢复与构建前journal检查

日期2026-10-03。继续完整批准／执行／恢复主链，本批未完成UI pending保持。

## 实施

新增recoveredDappResult，从现代Ledger详情读取原TransactionData bytes、签名和effects。用原journal回执检查digest／effects／成功状态／epoch／checkpoint，校验session绑定、bytes摘要、sender及gas owner；既有执行路径额外要求bytes与原批准一致。仅接受当前普通自付费入口支持的单个ED25519／Secp256k1／Secp256r1签名，并用SDK verifyTransactionSignature检查TransactionData Intent与授权地址。不盲取数组首项，不扩展赞助／多签／zkLogin业务。

executeDappPrepared遇到已有终态且本次未签名时，改为读取与验证原签名，不再抛出必须另行查询的占位错误。新增recoverDappExecution：只接收accountId／requestId，从journal按执行scope＋原requestId定位，检查账户／来源／绑定。pending通过原coordinator只读恢复；已有终态只读取详情；全过程不构建、不signData、不dispatch，取结果后再次授权。详情缺失、签名无效或撤权拒绝返回，但不删除journal。

新命令已接UiConnection与BackgroundClient；其权限仍来自扩展UI连接检查、真实账户／请求／origin许可及生命周期，而非调用者提供digest或signature。

prepareDappTransaction在准备前、准备完成后均检查当前请求journal记录与同scope pending。有记录即要求恢复；存储不可读拒绝准备。防止已有执行结果时重新解析gas并登记新批准bytes。

## SDK依据

当前rtd-ts-sdk/packages/typescript/src/grpc/core.ts的parseGrpcTransactionResponse返回transaction.bcs（原TransactionData）、signatures序列和effects.bcs；client/types.ts对应现代Transaction类型。verify/verify.ts的verifyTransactionSignature校验交易Intent及address。这是当前本地SDK权威契约，与方案固定官方gRPC交易模型一致；未改SDK。

## 验证

20261003-dapp-recovery-tests.log：6文件87/87通过；新增原签名恢复helper12项、后台恢复6项、通信1项、构建前journal4项。实际SDK和Ed25519测试覆盖原成功／失败回执、错bytes／digest／effects／sender／绑定、多签集合、不同地址签名、PersonalMessage Intent错用；后台覆盖无记录、pending、已有终态、错origin和末尾撤权。原coordinator／Ledger回归仍通过。

完整TypeScript检查通过：20261003-dapp-recovery-typecheck.log。本批未重新构建、未运行真实链执行或Chrome dApp审批；此前扩展启动证据不代替本批恢复链验收。

## 下一步

批准页与redux当前仍把pending当错误发送给dApp并关闭原请求，尚未使用新增恢复命令；下一批必须改为保留原请求、只读查询原结果，禁止再次批准／重建。后台worker重启后请求生命周期与持久回执的关系、全部入口自动唤醒继续按完整TX清单处理。本批不勾选TX完成项。
