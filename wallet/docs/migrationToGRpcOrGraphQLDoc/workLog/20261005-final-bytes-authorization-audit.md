# TX-01：最终字节与赞助签名边界核对

日期：2026-10-05。TX-01保持pending；本批补直接测试与权威合同，单测不能用于宣布新扩展所有授权交互已通过。

## B1：调用链

| 边界 | 当前实现与直接测试 | 合同 |
| --- | --- | --- |
| 预览输入 | usePreparedTransaction捕获一次modern getData快照，query key与clone共用；dApp由背景持久请求准备 | 调用方后续改Transaction不替换本次预览，不复制可执行build plugin |
| Fullnode准备 | WalletTransactionReader.prepare，SDK resolver，正式checks-enabled最终BCS模拟 | sender必须属于授权账户；显式owner／price／budget／payment／expiration保持；解析gas后才冻结bytes与digest |
| 预览展示 | useTransactionData／useTransactionGasBudget共用prepared；GasFees与TransactionValidity读最终交易 | gas sponsor、budget与expiration取批准值；BCS不可解析或时间戳限制不支持时禁止批准 |
| 币、NFT、质押／赎回确认 | 对应revalidate*仅模拟prepared.bytesBase64，复核sender／binding／readSession／原输入／名称／digest | 不重新选择对象或重建gas，失败要求重新预览；页面按钮及handler均校验有效期 |
| 内部background提交 | executeWalletPrepared冻结参数，经withExecutionAccount复核账户／网络／权限 | 当前reader再次模拟同bytes，名称收款参数再次核验，同Intent签名 |
| dApp批准凭据 | DappPreparedRegistry冻结bytes／digest／sender、request／origin／sourceHash／binding及mode | 随机token同步单次consume；新预览撤销旧token，五分钟到期，worker重启重新预览 |
| dApp只签名 | signDappPrepared正式模拟、TransactionData Intent、同bytes验签 | 不重建／不执行；sender可对含外部gas owner的完整交易签名 |
| dApp execute | executeDappPrepared取固定token，委托coordinator／journal／reader | gas owner不同于sender时现有单签入口明确拒绝，不改owner或代替赞助方授权 |
| 提交／恢复 | WalletExecutionCoordinator五次授权＋TX-12故障矩阵；reader请求只携带同批准BCS | 落盘前失败不派发，落盘后未知仅查原摘要；回执不匹配不接纳 |

## B2：官方结论与本地差异

[Sui官方Sponsored Transactions](https://docs.sui.io/develop/transaction-payment/sponsor-txn)要求发送方与赞助方都对完整TransactionData（包含GasData）签名。赞助执行与Multisig账户是不同概念，不能把“需要两方签名”写成“同一个Multisig账户”。只签名流程可把发送方签名交给赞助服务继续收集签名，不能当成已经执行。

固定上游[Sui transaction.rs](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-types/src/transaction.rs)的required_signers包含sender，gas owner不同时再加入owner；[signature_verification.rs](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-types/src/signature_verification.rs)要求签名数量与required_signers一致，按地址／alias匹配每个签名并逐个验证同一Intent。当前本地rtd-types这两个函数在仅忽略空白／注释与RTD品牌命名后逐字等同；原始固定源码SHA及本地文件SHA已保存于[权威比对证据](../evidence/20261005-sponsored-authority.json)。没有修改RTD源码或推断完整上游与fork等价。

当前现代Wallet Standard execute输入没有外部赞助签名收集／授权合同，coordinator已在journal和模拟之前拒绝外部owner。此次保留该明确拒绝策略，仅补直接测试；没有宣称赞助执行可用，也没有以sender单签替换赞助签名。完整赞助收集／执行验收仍未成立。

## B3：新增7项直接边界

- coordinator：外部gas owner的完整BCS被单签execute拒绝，0授权／模拟／签名／验签／journal／dispatch，owner保持。
- dApp sign-only：发送方对赞助交易完整BCS签名，正式模拟、Intent及验签均取同一bytes；实际SDK签名验证通过，gas四字段与超安全整数Epoch保持；网络与账户接口仍是受控unit实现。
- 最终模拟：proto的gas owner、price、budget、payment version与expiration逐项被改，而BCS仍为批准值时全部拒绝，不能用服务端重建事实替换批准值。

首轮3文件104项通过；完整tsc发现新增测试对可选version使用+=，不是业务错误。使用已知fixture的非空version后完整检查再跑；首轮失败日志保留。补丁首次因空hunk在写入前被拒绝，删除空hunk后正常应用；未产生半份业务修改。

## 当前范围

此批业务实现仅沿用已完成TX-12的隔离终态写入修复；TX-01新增均为直接测试／文档。未新增实链交易、未重启原服务、未动原journal。赞助sign-only单测不是实际双签赞助执行，新产物完整授权交互及其真实Chrome证据仍待；TX-01父项不勾选，49/98、trial_ready=false。

最终16文件336定向／133文件1486全量、完整tsc与3文件Prettier通过。当前源码稳定[Local构建／profile AST](./20261005-final-bytes-local-build.json)sourceSha256=d330ab47666b81247b927752a4fecfb4317ab625b7aea568d0c433efa578b280，与当前源码一致；[四入口39方法闭包](./20261005-final-bytes-wire-closure.json)对应当前dist。产物字节与TX-12修复后的UI 9f390e／background 50b804一致；测试补齐未改变运行代码，仍无这一产物的Chrome／实链全验收。机器记录见[本批证据](../evidence/20261005-final-bytes-boundaries.json)，超大Epoch仅证明精度与批准值绑定，未证明其在当前链可执行。

05:04:56实际历史连续0–29278／29279 markers，coverage与watermark一致，原22水位不变，原PID66145继续运行、无退出码，见[最后只读观察](./20261005-final-bytes-history-observation.json)。有界历史上界386503未到，未恢复live，不作为新版资产页面通过。
