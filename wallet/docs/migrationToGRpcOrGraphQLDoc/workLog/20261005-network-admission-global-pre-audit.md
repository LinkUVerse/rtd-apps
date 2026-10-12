# CAP6全局准入／负面持久隔离与撤值：接入审计

承接[NC5本批完成](./20261005-network-capabilities-aggregate.md)与[最后双方验证02](./20261005-network-capabilities-aggregate-document-verification-final-02.json)。先保存[17份只读接入来源](./20261005-network-admission-global-pre-audit-source-01.json)，再细化F1–4；尚未修改业务源码，1051产品／57当前能力来源保持，49/98、trial_ready=false。

WalletRpcProvider仅以asset snapshot决定initializing／configured；余额／元数据／staking等已有独立入口，hasFullnodeSession明确只是transport存在，configured亦不表示ready。完整聚合尚未调用，不应为接入NC5而让Display失败阻止独立余额或同链普通执行。其effect会为每个profile新建session，旧proof／reader仍须取消及cache撤除。

后台NetworkEnv自定义审核只调用probeNetworkIdentity及host permissions，不审核schema／ABI／account页。transaction-network-identity的WeakMap只保留当前WalletReadSession内的NetworkIdentityError；新的后台操作新建session即可失去该负面记忆。已有NetworkObservations是独立IndexedDB strict transaction，scope=[1,H0,generation]，仅记录原生水位／reset-required；不可假称它已持久隔离wrong-chain或schema／ABI不兼容，也不能以profile revision绕过已有generation级高度reset。

钱包缓存save／hydrate已排除wallet-*及mutations，多数core hooks在isError时隐藏旧值；但history-hooks直接返回useQuery，故失败后不能把此前query.data自动视为当前成功。仅持久化过滤与gcTime=0不足以清除仍有observer的内存旧结果。CAP6需要同binding的负面事件撤去所有相关reader／proof与正在展示的值，并在回切同profile时用新session；范围不可波及执行journal或将旧摘要重提交。

初次读取时误把已列出的src/shared/rpc/WalletRpcProvider.ts与core/WalletRpcContext.ts写成其它目录的.tsx，读取失败后按精确清单修正；后续审计使用上述真实来源，不能把错误路径当实现故障或通过证据。本审计只有静态接入事实，没有CAP6代码、全局UI／后台实测、当前bundle或Chrome证明。
