# RPC-11／13：质押独立领域快照迁移与有限验证

2026-10-05。父任务49/98、trial_ready=false，完整目标继续。先保存[S1–S5实施前设计](./20261005-staking-domain-snapshot-design.md)，再编码、验证和同步双方合同；没有删除原目录或14份原文。此前状态保存在[整合前状态](./20261005-current-state-before-staking-domain.md)。

## 编码与合同

质押算法只消费对象BCS和治理动态表，原全资产reader却额外要求Display覆盖。本批新增WalletStakingSnapshotReader／WalletStakingSource／最小对象身份decoder，将实际六项依赖独立准入；复用原readStaking，奖励和APY算法不变。完整NFT／资产Display准入保持，最小对象不会冒充Display为空的完整资产。共享owner decoder保持原语义。Provider注入readStakingView，core hook按binding／session／owner缓存完整view与独立proof，不依赖资产snapshot key；失败撤下两者，切会话不复用旧仓位，idle才刷新，禁止持久化及隐式旧RPC回退。整体20秒从准入开始，原全部池／汇率／仓位、10000率表预算及末验保持。

双方04／03新增“质押独立BCS领域快照合同”逐字对齐；依据[Sui官方迁移映射](https://docs.sui.io/develop/accessing-data/json-rpc-migration)、[固定治理源码](https://raw.githubusercontent.com/MystenLabs/sui/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-json-rpc/src/governance_api.rs)及本地当前RTD治理／Move／SDL。没有把Sui运营时间表或新增接口当作RTD能力。

## 验证

[4文件58项定向](./20261005-staking-domain-targeted-03.log)通过：同一原治理组合矩阵在新旧两个reader各21项，覆盖V1／V2、active／inactive／pending、大整数舍入、全汇率和空推进分页、损坏／错池／取消／末次digest；新增11项领域准入／类型／错链／缺覆盖／末验／整体预算及4项真实StrictMode Provider隔离测试，原hook1项继续通过。Display缺失时独立完整质押成功、完整资产仍拒绝；资产准入pending不阻塞有效独立会话；generation切换撤下旧值，失败撤下view与proof。

[钱包136文件1531项](./20261005-staking-domain-full-tests-01.log)、[完整钱包tsc](./20261005-staking-domain-typecheck-03.log)、[core4项](./20261005-staking-domain-core-tests.log)、[core完整tsc](./20261005-staking-domain-core-typecheck.log)、[5项签名探针准入](./20261005-staking-domain-admission-tests.log)通过。比前批新增36个运行用例，其中21个是原治理矩阵在新reader重跑，不能冒称36项新算法。

[稳定Local构建](./20261005-staking-domain-local-build-01.json)退出0，1006份源码SHA de96b4418bb16a1f2e91d62e276048e66baf4d152dab7b625219e41270229404；构建前后及最终源码相同。UI b24b8f87408b850ae444fd0b1a3838677169f9098d5cf783344eeb765a881779；background f2628c361dd715cc0e5d13cd0dd83c804ad05c2c4a277d2aa3a43dda5e66b783，与前批background字节相同。双入口profile03revision2 AST通过；[四入口线协议审计](./20261005-staking-domain-wire-audit-01.json)21已用／18未用方法通过。之前dist完整备份在runtime/wallet-dist-before-staking-domain-20261005-01。

[原7条journal只读审核](./20261005-staking-domain-original-journal-audit-01.json)通过：实际当前worker与background一致，2profile的3个store逻辑SHA与前批一致，pending0，7原生GetTransaction核验effects／digest／epoch／checkpoint，0模拟0广播。[当前UI只签名](./20261005-staking-domain-fullnode-sign-only-01.log)通过：原公开测试账户、实际现代Kit、3次正式模拟、0Execute，同返回BCS预览digest与Intent验签、锁定／重启通过。沿用精确SPKI例外，不计正常CA、全部授权矩阵或完整质押页面通过。

[显式原生入口只读](./20261005-staking-domain-native-01.json)通过：生产static read及原生navigator.locks，S282633、epoch2，完整3条汇率，13请求约1.75秒；原账户该S下positions=[]，0模拟／签名／广播。不以此空仓位证明cp300333原质押不存在或已赎回，也不证明活跃奖励、真实赎回或生产规模。native mode必须显式选择；钱包profile和运行路由没有回退或改写。

## 保留的失败与当前限制

[targeted-02](./20261005-staking-domain-targeted-02.log)有1个测试失败：错误地假定单请求可以一直挂至整体20秒，实际单请求10秒先取消；改为连续7秒请求验证整体20秒，没有放宽产品超时。[typecheck-02](./20261005-staking-domain-typecheck-02.log)为测试读取公共AssetSnapshotProof未声明displayHistory的类型错误，改用实际对象属性断言；正式公共类型未放宽。

公开探针[live-01](./20261005-staking-domain-live-01.log)未加载测试CA；[live-02](./20261005-staking-domain-live-02.log)误以leaf充当完整信任；独立只读诊断取得UNABLE_TO_VERIFY_LEAF_SIGNATURE。使用server/ca.crt后的[live-03](./20261005-staking-domain-live-03.log)是实际HTTP503。公开健康只读也503，原生健康200；ingress错误定位到/_publication连接host.docker.internal:39592超时，主机本地39592仍能返回拒绝未知surface的403。没有绕过guard、重启Docker／消费者或修改固定回放源码；公开完整读取及Chrome质押仍未通过。

[06:43:28历史只读TLS观察](./20261005-staking-domain-history-01.json)：连续0–70187／70188 markers，原22水位不变，原有界PID66145运行、boundedExitCode=null、目标386503未达。指定RTD当前源码／debug来源守卫由原runner inspect再次验证；没有重启、恢复live或放宽覆盖。继续同一supervisor。

## 子任务状态

S1、S2编码和有限集成完成；S3有限故障／全量回归完成；S4原生汇率读取部分完成，公开入口、cp300333之后非空活跃仓位／奖励及大规模汇率仍待；S5本批合同、构建与证据完成。父RPC-11／13不勾选，49/98、trial_ready=false保持。

[结构化证据](./20261005-staking-domain-evidence.json)和[13文件源码清单](./20261005-staking-domain-source-inventory.json)保留当前事实。接下来继续公开授权建连问题、原认证回放和剩余接口／核心真实页面；未验证项不计通过。
