# F1d后台审核部署与交易依赖：当前只读审计

[机器审计](./20261005-background-move-admission-pre-audit-01.json)确认122项当前来源和1072项产品SHA保持，只读检查25份实现／本地SDK来源。没有业务代码修改或模拟／签名／广播，本阶段不计F1d已实现。

实际后台withExecutionAccount的authorize只接身份，没有交易参数；它在新session建立、coordinator模拟前后、签名前后和commitPending后／dispatch前被重复调用，并在网络探测后重查账户、profile、锁定状态。release-deployment-config已经由共同webpack构建输入提供，但只由当前UI观察协调消费。持久准入默认assertClear空targets覆盖identity；交易自己的staking／Kiosk／OriginByte等ABI Fault尚未按固定批准字节依赖消费。

内部executeWalletPrepared冻结输入，由coordinator以批准摘要校验固定bytes。dApp sign-only消费注册表后，以approvedTransaction校验固定bytes／sender／digest；execute同样使用注册表fixed bytes。dApp reauthorize还两次核验后台请求、来源绑定和当前权限。上述后台入口的固定字节才可成为依赖输入，UI NC5、请求的可变Transaction JSON或请求者给的group不能授权后台。

重要恢复边界：coordinator先authorize再读取本request旧record和scope pending，已有记录会直接返回，不能把新的ABI／发布pin要求提前到该只读分支。内部recover／stored receipt明确signing=false；dApp recover明确readOnly=true且不开transaction network probe。个人消息另走自己的chain／账户／权限校验，不含TransactionData，不能套Move ABI。

官方[PTB命令](https://docs.sui.io/references/ptb-commands)区分独立命令与MoveCall；展示的命令签名只是概念表示，不总是标准Move函数。官方[SDK命令参考](https://sdk.mystenlabs.com/sui/transactions/reference)对应splitCoins／transferObjects／moveCall等独立构造。官方[固定提交的transaction.proto](https://github.com/MystenLabs/sui-apis/blob/187995d1b57cddc3c67eb0f9d1affd4247ef110b/proto/sui/rpc/v2/transaction.proto)以command oneof分别定义MoveCall、TransferObjects、SplitCoins等。本地SDKTransactionData及commands以当前SHA单独审计；Sui最新withdrawal／address-balance或新命令不能据官方页面就推定RTD当前支持。4个公开快照与25份本地SHA见[来源清单](../evidence/official/20261005-background-move-admission-pre-audit/manifest.json)。

因此，普通PTB builtin不能由conceptual签名推导伪MoveCall ABI，也不能按profile包ID整包匹配就把Display／全部阅读ABI失败投射到所有新交易。下一步按[先存设计](./20261005-background-move-admission-design.md)依次完成精确依赖、原ticket协调及实际后台边界。未知用户类型／任意MoveCall仍为opaque，缺审核声明是未取得部署权威，不伪造known negative；固定发布配置损坏或相应pin不匹配必须显示有限政策失败，不能自动以运行时响应签认自己。

49/98、trial_ready=false；最终授权原子竞争、完整批准UI／只读原journal例外、四入口正常CA／当前扩展核心Chrome仍未验收。受保护RTD／回放PID66145、原journal和历史C9产物没有操作。见[更新前状态](./20261005-current-state-before-background-move-admission.md)。
