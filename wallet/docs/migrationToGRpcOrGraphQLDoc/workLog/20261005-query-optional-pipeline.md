# ENV-05／NET-11：可选Display管线准入与实际质押页面验证

2026-10-05。按[H1–H5实施前设计](./20261005-query-optional-pipeline-design.md)推进，本批完成入口修复和有限页面验证，父任务49/98、trial_ready=false。原目录及14份原文保留。

## 当前原因与修复

[当前真实诊断](./20261005-query-optional-pipeline-before-01.json)确认可复制发布前缀457546、22必需管线及288451端点有效；新增hist_displays使数据库成为23行，旧精确22行校验返回null。当前host授权403经ingress转为503，容器实际能连接；上一批TCP超时是历史故障，不能代替本批根因。

index_coverage保留原22必需管线，只额外接受显式hist_displays。每行校验名称唯一、规范整数、同链、hi／lo／pruner界限；可选初始化(-1,0,-1)有效但不授予字段覆盖。缺必需、未知、重复、错链、未来及损坏仍拒绝；基础窗口只由22必需行共同计算，原RR只读TLS、精确checkpoint端点和可复制发布事实保持。Display按当前SDL的字段availableRange、历史coverage／basis和固定S独立准入，完整资产合同未放宽。

依据[Sui官方迁移语义](https://docs.sui.io/develop/accessing-data/json-rpc-migration)、[固定官方ServiceConfig源码](https://raw.githubusercontent.com/MystenLabs/sui/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-indexer-alt-graphql/src/api/types/service_config.rs)及本地当前RTD available_range.rs。22＋可选允许名单为本地部署合同，未声称Sui规定该数量。

## 部署与测试

[11项新增守卫](./20261005-query-optional-pipeline-unit-02.log)、[7项受控reload守卫](./20261005-query-optional-pipeline-reload-unit-01.log)、[10项原窗口／传输／队列回归](./20261005-query-optional-pipeline-legacy-tests-03.log)通过。[真实RR／TLS](./20261005-query-optional-pipeline-native-01.json)取得0–288451窗口，并用5组只读SQL投影拒绝可选未来／错链、未知、缺必需及重复；无数据库篡改。

指定link-u-smart-contract的reload_wallet_query_optional_pipeline.py先核对私有baseline、当前来源、11项测试和真实SQL证明，持有operation.lock，仅改变index_coverage源码绑定；停止原owned监听器、原子保存config／manifest／binding后，同launcher／解释器／环境启动一次。计划和[实际替换](./20261005-query-optional-pipeline-reload-apply-01.log)通过：11462→82796，fresh204和owned身份核验；32 backlog、8检查／32请求预算不变。native消费者、adapter、publisher和原回放未重启，RTD当前debug来源不变。

公开TLS生产reader[真实16请求](./20261005-query-optional-pipeline-public-01.json)全部HTTP200：质押S288425、epoch2、3汇率、完整空仓位、13请求；S100 Display能力成立，S85345未覆盖及完整资产拒绝（partial），0模拟／签名／广播。Node使用server/ca.crt信任，未回退native或改profile。

## 验证者选择与当前扩展

SelectValidatorCard曾用assetSnapshotKey清空选择；[新增两项失败复现](./20261005-query-optional-pipeline-selection-before-01.log)证明无关NFT轮换取消选择。改用质押自己的proof key和readSessionKey，继承父view同时传proof key，保持质押proof／session变化清空。三项新增、[24项定向](./20261005-query-optional-pipeline-wallet-targeted-01.log)、[136文件1534项全量](./20261005-query-optional-pipeline-wallet-full-tests-01.log)及[完整tsc](./20261005-query-optional-pipeline-wallet-typecheck-02.log)通过。

[稳定1006份源码Local构建](./20261005-query-optional-pipeline-local-build-02.json)及双入口profile AST通过，源码SHA e7e4f578665fd683450e8c00558280bec56e102b93f4baa3a55ee08947f5b52c；UI0636b5e6303ca4181478e66fd333211e7cacb53481cce6326d89fa711f777265、backgroundf2628c361dd715cc0e5d13cd0dd83c804ad05c2c4a277d2aa3a43dda5e66b783。[四入口闭包](./20261005-query-optional-pipeline-wire-audit.json)仍21已用／18未用。两份旧产物备份保持。

[真实Chrome](./20261005-query-optional-pipeline-staking-page-02.json)使用原账户／profile，实际加载ui.js和worker逐字匹配当前dist；公开入口1验证者列表、选择、真实Display失败后选择保持、进入#/stake/new通过。[选择截图](./20261005-query-optional-pipeline-staking-page-02-validators.png)和[表单截图](./20261005-query-optional-pipeline-staking-page-02-form.png)已查看。表单正确拒绝缺metadata，原两条confirmed-success journal逐字段不变、已重新锁定、0模拟0Execute。采用精确SPKI例外，不计正常CA或自定义权限；空仓位S仍早于cp300333，活跃奖励／预览／批准／赎回和完整试用未验。

## 失败保留与回放边界

legacy-tests-01为解释器路径错误；legacy-tests-02的默认backlog5夹具在16并发时ConnectionReset，修为当前host32队列后通过，仅验证Handler预算，不证明Docker8100或完整过载。typecheck-01和build-01为新增测试React泛型错误，修为显式测试泛型后通过；旧失败与partial产物保留。staking-page-01在launch前因verifier参数名错误TypeError，改extension后page-02通过，未启动旧profile或发送交易。

[一次历史状态读取](./20261005-query-optional-pipeline-history-rejection-01.json)因marker／endpoint／durable watermark合同不一致被拒绝，当次差值未捕获；没有忽略错误。随后[只读RR诊断](./20261005-query-optional-pipeline-history-diagnostic-01.json)及[全来源guard新观察](./20261005-query-optional-pipeline-history-02.json)通过：07:04:38连续0–79696／79697 markers，原22水位不变、PID66145运行、boundedExitCode=null。后来的单次一致不能证明整个回放原子性故障合同；D5须继续调查此拒绝。未重启、放宽守卫或提前恢复原管线，386503终态仍待。

H1–H5本批合同／实现／有限验证和文档同步完成；父ENV-05／NET-11保持开放。下一优先RPC-04独立metadata准入，随后完整资产、cp300333之后仓位和实际核心页面，不以入口恢复宣称可试用。

页面trace.checkpoint后续发现记录了查询中第一个selector（walletGenesis=0），不能据此推导页面领域S；原文件保持，独立生产reader的实际proof仍有效，见[追踪字段更正](./20261005-coin-metadata-page-trace-correction.json)。
