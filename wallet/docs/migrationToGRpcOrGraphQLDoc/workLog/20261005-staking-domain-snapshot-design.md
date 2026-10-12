# RPC-11／13：质押领域快照实施前设计

2026-10-05。上一轮跨上下文读取预算为真实进展；原有界回放session59830本轮确认仍活，保持原supervisor及固定源码。父任务49/98，trial_ready=false。

当前WalletAssetReader.staking复用包括MoveValue.display的完整资产coverage，并在0x5及StakedRtd对象选择中请求display。质押算法实际只消费对象ID／version／digest／owner／type／BCS、动态字段和同S系统状态，不消费Display。于是历史Display未追到其它依赖下界时，独立质押查询也被无关模板覆盖阻断。官方[Sui迁移指南](https://docs.sui.io/develop/accessing-data/json-rpc-migration)的getStakes映射是按类型读取StakedSui对象；官方固定[governance_api.rs](https://raw.githubusercontent.com/MystenLabs/sui/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-json-rpc/src/governance_api.rs)和本地RTD算法以BCS池／汇率组合奖励，不要求展示模板。依赖应按实际领域选择树声明。

新增仅供质押的BCS快照reader：依赖Query.checkpoints／object、Address.objects／dynamicFields／dynamicField及MoveObject.contents，不查询Display、JSON或转移能力。返回最小Move对象引用，与完整WalletAssetObject明确区分，不能向NFT展示或转移页冒充已读取Display。继续原0x5／inner／active与inactive池／全汇率表／全部owner仓位读取、严格BCS及ID／owner／type／字段派生核验、空推进页、重复／损坏拒绝、同H0／S／digest／coverage和最终末验，不改金额／APY算法或10000总率表／20秒有界策略。

独立readStakingView由真实WalletRpcProvider注入，核心hook以完整binding／readSession／owner作用域保存当前完整view和它自己的snapshot proof；不依赖NFT assetSnapshotKey，不持久化、错误撤下旧值、不自动重试。周期／focus／reconnect刷新只在当前读取idle时执行，不取消有界全仓位组合。系统／验证者／仓位仍内部同S；不得把不同领域S当作一个原子账户资产总汇或用索引仓位授权交易。发送／赎回依旧Fullnode新鲜对象＋正式固定bytes模拟。

| 子任务 | 合同 | 状态 |
| --- | --- | --- |
| S1 | 最小BCS reader／实际依赖，复用原治理组合并严格隔离NFT Display合同 | 待编码 |
| S2 | Provider／core hook接入、会话／owner／失败／取消／刷新范围 | 待编码验证 |
| S3 | 无Display覆盖时质押完整读取、完整资产继续拒绝；损坏／错链／末验及全量回归 | 待验证 |
| S4 | 原同链只读质押／汇率／原仓位核验，不能重提原交易 | 待验证 |
| S5 | 双方04／03技术合同、Task／workLog／totalProgress与当前产物证据 | 待完成 |

大规模汇率历史仍受原10000／20秒本地预算；本批不把小链或合成规模用例当生产吞吐、活跃奖励兑付或Chrome完整质押／赎回验收。需要实际同S非空活跃仓位才可主张相应部分通过。既有stake在cp300333，原7条journal保留；不新建账户、领币或提交。
