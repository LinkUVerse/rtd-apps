# RPC-05／06／04：完整余额集合独立快照实施前设计

2026-10-05。上一goal轮为实际编码／Chrome预览进展；本轮原supervisor session59830确认仍运行，未重启。当前useGetAllBalances经完整ASSET_COVERAGE，使无关Display覆盖失败阻塞tokens与ActiveCoinsCard；metadata／质押已独立，余额仍需迁移。

[Sui官方映射](https://docs.sui.io/develop/accessing-data/json-rpc-migration)将余额对应StateService.GetBalance／ListBalances或Address.balance／balances；[固定官方Balance源码](https://raw.githubusercontent.com/MystenLabs/sui/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-indexer-alt-graphql/src/api/types/balance.rs)及当前RTD IAddressable.balances→consistent，不依赖hist_displays。使用独立GraphQL固定S完整集合；不以Fullnode单币查询冒充同S全集合。

抽取共同类型／原子数量检查及readSnapshotBalances，完整WalletAssetReader内部仍共用自身S／proof。独立WalletBalanceReader声明Query.checkpoints＋Address.balances，整体20秒覆盖准入／全部页／末验，叶10秒与原256页／10000项／50页长限制保持。严格规范u128、coin＋address=total、规范币种、请求owner、唯一币种和推进cursor；明确完整空列表有效，缺字段／partial／错链／范围或摘要变化／取消都失败，不能将失败当零余额。

Provider有效session独立注入readBalances，hook key为wallet-balances／binding／readSession／规范owner，raw cache保留完整集合＋proof；gc0不persist，idle20秒刷新，旧会话／自己的失败撤下list与proof。NFT轮换不影响独立已准入余额，但独立余额与metadata不能拼接宣称同一完整资产快照。交易确认后的币／NFT／质押UI增加wallet-balances失效通知；该动作不证明TX-08目标checkpoint已追平，receipt依旧单独验覆盖。完整资产内部方法与慢读调度仍有实际Provider回归，原读取cancel边界保持。

| 子任务 | 合同 | 状态 |
| --- | --- | --- |
| Q1 | 官方／本地语义、Display无关触发复现、完整领域合同与Task保存 | 已用5实际Provider用例复现4失败，设计先存 |
| Q2 | 共同解码／完整reader、独立余额reader、Provider／hook及确认缓存通知 | 本批编码完成，追加精确批准金额与摘要 |
| Q3 | 多页／金额／owner／重复／cursor／边界／取消／总deadline、真实Provider与切换／错误、钱包全量及双方tsc | 96定向、1594全量、core4及双方tsc通过 |
| Q4 | 审核Local稳定产物、实际公开TLS固定S全余额、原账户当前Chrome首页／币发送预览、零Execute | 新1014源码Local与当前Chrome有限验证通过 |
| Q5 | 双方SDK合同、Task／进度／失败与来源证据同步 | 本批同步，完整父任务开放 |

RPC-05／06原完整分页与失败合同保持，本批不是将完整范围缩水为一页／单币成功；真实多币／多页、nonnative表单与发送全部仍归完整RPC-04／TRY／QA。当前原22索引尚早于新币／cp300333仓位，不能拿旧S缺币推导Fullnode不存在；不重复部署、reseed或重复原交易。继续同一认证回放，此前一次状态拒绝调查和386503终态门槛保持，父49/98、trial_ready=false。

## Q2／Q3／Q4补充：当前币预览实际缺口

编码前依据page-02实际截图／两次checks启用模拟：最终发送可用，但1.000000001被TxnAmount默认两位截断为1 RTD，且没有展示固定prepared.digest。旧page脚本要求摘要可见，失败不改为通过。按双方交易合同2.1的精确数量／固定bytes批准，给TxnAmount增加显式FULL选项，仅币发送批准使用完整小数，原列表／收据默认保持；币批准同时显示prepared.digest，禁止拿它当提交回执。先保存可见精确金额与摘要回归，再改代码、重做全量／类型／稳定构建及当前Chrome。两次原失败均零Execute，原记录保留；第二次原两journal／锁定仍须后续完整复核。
