# RPC-14：交易执行接口与失败结果映射完成

日期：2026-10-04。此编号为Task实施项；08章节线协议编号RPC-10映射到本项，两种编号的对应关系已列于Task追溯表。

## 权威合同复核

本轮重新读取Sui官方[Wallet Builders迁移文档](https://sdk.mystenlabs.com/sui/migrations/sui-2.0/wallet-builders)：Wallet Standard输出字段不变；新Core结果为Transaction／FailedTransaction联合类型，effects BCS来自tx.effects.bcs。官方示例的signatures[0]不等于任意赞助或多签授权；本钱包普通账户路径保留本地原签名，恢复时校验唯一签名、签名scheme、TransactionData Intent与授权地址，不猜测外部签名归属。

## 当前源码与调用闭环

- 当前钱包生产源码只有WalletExecutionReader的transactionExecutionService.executeTransaction执行网络提交；请求携带批准bytes、签名集合及明确RECEIPT_READ_MASK。没有旧WalletSigner／executeTransactionBlock调用器。
- 内部币／NFT／质押入口均通过background.executePreparedTransaction；dApp经executeDappPrepared。二者进入同一个协调器，批准绑定、最终正式模拟、签名与验签、pending落盘后才派发一次。
- 真实proto回执先核验交易bytes／digest／signatures、effects BCS和status／epoch／gas等字段一致性，success=false返回已确认链失败。网络异常、缺失或不兼容回执不伪造FailedTransaction，保持未知并按原摘要恢复。
- dApp返回bytes／signature／digest／effects规范Base64字段，现代Kit从effects识别FailedTransaction；内部界面使用领域receipt，不保留旧DTO执行facade。GraphQL和archive从不接收执行提交。
- recoveredDappResult从完整Ledger详情恢复原bytes和effects，核验同binding／sender／gasOwner／digest／epoch／checkpoint，再本地验证签名；缺详情或矛盾不输出伪造标准结果。

## 证据

1. TX-06已记录实际钱包一次成功／失败执行与持久恢复。新增失败d4kE2koaXQ829UWnhXd8exWawWa37zEuzCfA7WLdkRC于checkpoint390790，MoveAbort EClosed=1；实际现代dApp返回FailedTransaction，原bytes相同，浏览器重启后journal confirmed-failure保留。
2. 本轮probe-wallet-failed-execution.ts追加实际reader.details＋recoveredDappResult，从真实Ledger详情验证原签名和完整标准输出，并与已返回dApp的签名、批准bytes、effects逐字段相等。0模拟0执行；Gate仍closed=true、visits=0。日志20261004-RPC-14-failure-standard.json/.log。
3. 实际Chrome同一保留profile，原4条success＋1条failure保持。后台解锁后新开收据页面，实际展示“交易失败”、MoveAbort模块／visit／指令9／abort code1、对象变化及0.000045744 RTD费用；页面仍明确资产索引同步中，不能将终态回执等同于资产已追平。0模拟0执行。后台源码通过CDP与e355c0d81dbf3dc4e2eef83bac004ec6a549dc891124227c5826ab5f78799c5b当前构建核验。日志20261004-RPC-14-failure-receipt-fresh-tab.log。
4. 6文件124项测试通过：execution-reader、execution-coordinator、dapp-recovered-result、WalletStandardInterface、background/dapp-execution和background/execution。覆盖成功／失败联合类型、原签名、原effects、缺字段与错摘要、不能将NOT_FOUND当失败、只提交一次、授权与恢复。日志20261004-RPC-14-tests.log。
5. 上轮新构建及Provider／四入口wire审计已通过，本轮未改业务源码或重新构建。新的探针以tsx真实执行，浏览器脚本以Node真实执行；不声称wallet tsconfig覆盖scripts。

## 保留失败与范围

首次收据测试和费用扩展测试曾在后台命令解锁后沿用旧UI query cache，守卫读取到旧locked状态并跳转tokens，断言失败。等待tokens路由不能证明账户缓存已刷新；最后采用解锁后新UI document，使真实账户查询重新读取状态。过程日志chrome.log、chrome-retry.log和receipt-gas.log均保留，其中chrome-retry只验证了失败详情可见，费用仍为加载状态；没有改业务守卫或用脚本写UI缓存。成功验证使用真实新页面，只读观察且未重发交易。

先前wallet-coin-execution-01旧deployer未决摘要仍保留，不因其它账户已完成标准结果映射而删除或再次发送。RPC-14的接口迁移／结果合同完成，不代表每类币／NFT／质押业务路径、所有权限切换或试用包完成；这些由RPC-03／04／11／13／22／23、TX、TRY及QA继续跟踪。浏览器SPKI例外也不等于原生证书／host权限矩阵。

总体48/98（49.0%），trial_ready=false。
