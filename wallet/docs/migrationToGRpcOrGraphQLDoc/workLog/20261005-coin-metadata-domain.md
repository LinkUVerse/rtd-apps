# RPC-04：Coin metadata独立快照与实际金额表单

2026-10-05。按[K1–K5实施前设计](./20261005-coin-metadata-domain-design.md)编码／验证，本批完成有限合同，49/98、trial_ready=false。原目录及14份原文保持。

## 迁移合同

此前useCoinMetadata经完整ASSET_COVERAGE准入，使无关Display未覆盖阻塞质押金额表单。新增WalletCoinMetadataReader，仅依赖Query.checkpoints及Query.coinMetadata；本地后者availableRange依赖consistent＋obj_versions。整体20秒覆盖准入、固定S读与末验，单叶10秒、session取消和原生跨上下文预算保持。共同readSnapshotCoinMetadata严格解码，成功和明确null都重验S摘要／coverage后返回；完整WalletAssetReader.coinMetadata仍用完整reader原proof，同S内部组合保持。没有修改RTD／BCS、Display范围或运行消费者。

Provider的有效session独立注入metadata。core hook键为wallet-coin-metadata／binding／readSession／规范type，idle20秒刷新，gc0不persist；raw cache保留value＋proof，显示失败撤下两者。NFT key变化或Display失败不撤下独立成功metadata，切会话不复用旧值。字段缺失／partial／错链／末验改变／取消为失败，明确null为不存在，decimals0–255严格整数，零有效；override仅labels。金额未知仍禁止解析和准备，独立proof不能拼接宣称完整资产原子快照。

[Sui官方映射](https://docs.sui.io/develop/accessing-data/json-rpc-migration)支持GetCoinInfo或Query.coinMetadata；[固定官方源码](https://raw.githubusercontent.com/MystenLabs/sui/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-indexer-alt-graphql/src/api/types/coin_metadata.rs)及本地RTD by_coin_type按scope先Currency再CoinMetadata singleton。选用GraphQL独立域，不改用隐式Fullnode或旧RPC回退，不硬编码RTD decimals。双方04／03旧“所有hook共享proof”表述已同时修正；完整reader内部同S合同保留，新领域合同精确对齐。

## 编码／库验证

[4文件66项定向](./20261005-coin-metadata-targeted-01.log)通过。新增22项reader真实SDK／RTD＋SDK＋固定Sui SDL投影：null／0／255、缺字段、坏类型和精度、partial／错链／缺coverage／末验变化、取消／关闭／20秒整体；新增5项实际StrictMode Provider／QueryClient：Display失败或pending独立成功、自己的失败撤下metadata与proof、generation等待撤值／type隔离、null proof及未配置零fetch。既有9项资产hooks按独立合同更新，原30项资产reader继续通过；完整资产元数据新增加末验。

[钱包138文件1561项](./20261005-coin-metadata-full-tests-01.log)、[完整钱包tsc](./20261005-coin-metadata-typecheck-01.log)、[core4项](./20261005-coin-metadata-core-tests-01.log)及[core完整tsc](./20261005-coin-metadata-core-typecheck-01.log)通过。新增27运行用例，不把原测试数当新增。

## 实际公开入口与当前Chrome

[真实公开TLS](./20261005-coin-metadata-public-01.json)当前生产reader用server/ca.crt和原生navigator.locks，S288451链上metadata id／decimals9／RTD labels成立、4请求完整末验；另4请求确认明确missing type为null，完整Display资产仍拒绝，全部9请求HTTP200，0模拟／签名／Execute。不存在类型探针不代表非原生币种精度或发送表单通过。

[稳定Local构建](./20261005-coin-metadata-local-build-01.json)1009份源码SHA c63396fd22fec7f2b9b3eda169059a70dae7582f56bdbde7aebd1f8d32381d2b，构建前后及最终一致；UIe55ab51fac44dbe500b2d9dece195e1fcaed1ae1e69d7645920dabed723640fb、backgroundd58de29527bf81e3cbda48cb4ac93b6e7ae59d37e1169e8faa0196d12852c641。显式profile03rev2、双入口AST及[四入口21已用／18未用闭包](./20261005-coin-metadata-wire-audit-01.json)通过；此前产物完整备份保持。

[当前真实Chrome第三次采集](./20261005-coin-metadata-staking-page-03.json)actual UI及worker逐字匹配当前dist；原账户公开验证者列表／选择／真实Display失败后选择保持／表单跳转通过。metadata读S288451、HTTP200、decimals9；表单接受1.000000001 RTD并启用预览按钮，1.0000000001拒绝，未点击预览或批准，0模拟0Execute、原两条journal不变并重新锁定。[表单截图](./20261005-coin-metadata-staking-page-03-form.png)及[选择截图](./20261005-coin-metadata-staking-page-03-validators.png)保留。输入及验证通过不是已完成实际原子金额解析／交易准备／奖励／赎回。精确SPKI例外不是正常CA或自定义权限。

[两个原profile七条journal／原生effects只读审核](./20261005-coin-metadata-original-journal-audit-02.json)通过，pending0、两profile当前worker与background逐字相同、逻辑store SHA与上一批staking-domain完全一致，7次GetTransaction，0模拟0Execute。原成功和链失败记录不删除、不重发。

## 保留记录与剩余边界

staking-page-01在launch／worker准入范围Error失败，当次未取得UI，原因未细化，记录保留；page-02已成功，但trace.checkpoint取到前置walletGenesis=0，不能当作领域S。原文件未改，[追踪更正](./20261005-coin-metadata-page-trace-correction.json)明确范围后，page-03用walletSnapshot selector重新证明S288451。original-journal-audit-01因dapp profile旧worker唤醒ERR_BLOCKED_BY_CLIENT拒绝，0lookup／模拟／Execute，旧记录保持；新audit-02当前worker逐字匹配后通过。

最新[当前debug来源与历史只读TLS](./20261005-coin-metadata-history-01.json)于2026-10-04T23:14:19.117052+00:00取得连续0–83684／83685 markers，原22水位不变、原PID66145运行、boundedExitCode=null。只读诊断wrapper始终调用原严格validator，不绕过；此前H批一次状态拒绝及其D5调查门槛保留。目标386503未达，原22不能提前恢复；没有重启链、reseed或改写checkpoint。

K1–K5本批有限合同完成，RPC-04仍有真实非原生metadata／发送表单／发送全部及其完整合同；RPC-11／13仍有cp300333之后非空仓位、活跃奖励、实际赎回和规模。核心预览／完整资产／正常CA和TRY／QA待，49/98、trial_ready=false。下一优先核验最新实际质押预览（正式模拟、零广播），继续剩余接口与同一认证回放。
