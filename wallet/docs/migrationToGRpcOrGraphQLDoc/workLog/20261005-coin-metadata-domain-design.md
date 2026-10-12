# RPC-04：Coin metadata独立快照实施前设计

2026-10-05。H1–H5公开入口和真实Chrome已完成有限验证；质押表单因useCoinMetadata经完整ASSET_COVERAGE读取、Display未追平而拒绝。父任务49/98、trial_ready=false；此轮先保存合同和K1–K5，再编码。

[Sui官方迁移映射](https://docs.sui.io/develop/accessing-data/json-rpc-migration)明确GetCoinInfo或Query.coinMetadata；[固定官方coin_metadata源码](https://raw.githubusercontent.com/MystenLabs/sui/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-indexer-alt-graphql/src/api/types/coin_metadata.rs)及本地RTD by_coin_type按传入scope先查Currency再查CoinMetadata singleton。本地available_range.rs:396依赖consistent＋obj_versions，不依赖hist_displays。选用独立GraphQL领域，保持固定S，不改为无声明Fullnode回退或常数9。

WalletCoinMetadataReader独立声明Query.checkpoints＋Query.coinMetadata；整体20秒包括准入／固定S读取／末验，叶请求原10秒及跨上下文预算保持。抽取共同decodeCoinMetadata／readSnapshotCoinMetadata，完整WalletAssetReader.coinMetadata仍保留自身proof，独立reader不返回完整资产reader。明确null为不存在；缺字段、partial、错链、coverage／digest变化、取消／旧session均失败。decimals必须规范0–255整数，零有效；labels override不修改链上精度；成功或null均完成末验。

Provider有效session期间可读取独立metadata，不等完整NFT准入。core hook键为wallet-coin-metadata／binding／readSession／规范type，保留带proof的raw cache，gc0禁止persist，idle20秒刷新，缺方法拒绝而无旧RPC回退；失败撤下metadata与proof，切会话不复用旧值。NFT失败／asset key变化不撤下独立成功metadata，但metadata自己的失败必须显示未知并阻止金额解析。单独展示的metadata与资产proof不同；需要同S组合时调用完整reader内方法，不能拼接独立结果宣称原子资产快照。

| 子任务 | 验收内容 | 当前状态 |
| --- | --- | --- |
| K1 | 官方／本地语义与Display依赖边界、缓存／精度／末验合同 | 已核对，实施前保存 |
| K2 | 独立reader、共同严格decoder、Provider及core hook | 待编码 |
| K3 | SDL三个schema投影、缺字段／null／0／错链／末验／取消／deadline、真实Provider／QueryClient隔离与全量／tsc | 待执行 |
| K4 | 审核Local稳定产物、公开TLS当前元数据、真实Chrome表单与金额输入；零批准零Execute | 待执行 |
| K5 | 双方SDK／网络合同精确对齐、Task／日志／进度／源证据同步 | 待完成 |

原cp300333仓位仍晚于原22管线共同S；不重复提交原交易，不以metadata成功验收活跃奖励、赎回、发送全部或正常CA。原Display回放继续同PID／scope，保留一次状态拒绝和后续RR一致，D5调查和386503终态未完成。
