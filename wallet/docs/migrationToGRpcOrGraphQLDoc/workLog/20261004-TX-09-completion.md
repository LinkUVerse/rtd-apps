# TX-09 modern Wallet Standard合同完成核验

2026-10-04，完成本项接口迁移合同；不等于TX-10或全部QA／试用完成。

## 权威对标

- [signTransaction源码](https://github.com/MystenLabs/ts-sdks/blob/main/packages/wallet-standard/src/features/suiSignTransaction.ts)：2.0，transaction.toJSON、account、chain必填，signal可选；返回bytes／signature。
- [signAndExecuteTransaction源码](https://github.com/MystenLabs/ts-sdks/blob/main/packages/wallet-standard/src/features/suiSignAndExecuteTransaction.ts)：2.0，继承交易输入，输出增加digest／BCS effects。
- [PersonalMessage源码](https://github.com/MystenLabs/ts-sdks/blob/main/packages/wallet-standard/src/features/suiSignPersonalMessage.ts)：1.1，message／account必填，chain可选。
- [Wallet Builders](https://sdk.mystenlabs.com/sui/migrations/sui-2.0/wallet-builders)：Core迁移改变effects获取位置，不改变公开输出；移除reportTransactionEffects。

官方来源为本轮连续审计查询的main／在线文档，不冒称固定commit。RTD使用本地对应rtd命名空间，保留相同现代合同。官方示例中的signatures[0]不能替代本地授权签名身份验证；赞助／多签未来独立验收，不暗中启用。

## 逐项证据

| 合同 | 实现与证据 |
| --- | --- |
| 仅发布现代三feature及正确版本 | WalletStandardInterface当前2.0／2.0／1.1，旧signMessage、TransactionBlock及reportTransactionEffects不注册；类型和接口回归在当前1293项中。 |
| 显式account与交易chain | 三方法缺账户前置拒绝，无首账户回退；交易缺chain页面与后台都拒绝，无当前链回退；20261004-explicit-account.md和explicit-chain.md实际扩展覆盖。 |
| PersonalMessage可选chain | 省略不要求节点／gas，显式chain贯穿后台复核；普通Intent／原消息bytes保持，实际省略及显式签名验签、错链拒绝通过。 |
| sign-only输出与不广播 | 后台固定bytes及本地签名返回，不执行；最新实际预览digest与结果一致，5模拟0提交，20261004-explicit-chain-extension.log。 |
| execute现代输出 | 后台协调器持久pending后提交，返回同bytes、本地signature、digest、effectsBase64；TRY-03实际四字段／验签／effects成功校验通过。当前全量包含正常／失败receipt恢复、错误字段与签名身份拒绝。 |
| 联合结果及恢复 | 不把pending伪装成成功结果；无原详情不编造signature；链失败BCS保留语义，见dapp-recovered-result.test.ts、dapp-execution.test.ts、TRY-03／04。 |
| 可选AbortSignal | 页面signal不跨JSON边界，仅请求ID绑定原port取消；实际预取消／序列化／批准／模拟取消通过；当前worker提交后非timeout取消、pending跨重启且锁定原摘要恢复成功，20261004-dapp-abort-verified.md。 |
| 账户能力与自定义链发现 | 仅已启用本地密钥账户声明三签名能力；自定义account.chains属于wallet.chains，网络事件公布新集合；当前全量回归覆盖。 |

当前最终121文件1293项、钱包tsc、dev构建及四入口审计通过；最新真实扩展验证account／chain输入、正常消息与只签名，CDP确认实际后台源码一致。当前构建没有再次execute实链，沿用此前相同成功execute合同及当前全量回归，不冒称本次又执行。此前缓存旧worker的失败保留并已有新worker单独通过证据。

## 仍开放

TX-10完整origin/account/chain/request/tab授权与事件矩阵、跨窗口／完整切网细节，以及QA-A18、正常CA／自定义权限、所有资产接口和试用门槛仍按Task继续。仅将TX-09由未完成改为完成，合计40/98（40.8%），trial_ready=false。
