# 2026-10-05：D6最新debug安装与D5认证历史回放

本批仍属于RPC-03／NET-04的D5–D6：**最新源码debug及新历史schema安装、核心原链就绪验证通过；认证历史回放执行中，完整Display／生产资产reader／新版Chrome未验收。** Task仍48/98，trial_ready=false。

## 已验证构建与受控部署

RTD HEAD49a05a0de323b45a49d067a855c419e98d071afc，工作diff96bc0f4b182664bba6eab123f420d282d491bfdecd61ec39fef84dff5ef4c1fe。八目标在独立APFS clone target构建成功，完整索引器66项回归通过，两个sourceUnchanged=true，与D4 Reader38／GraphQL249的完整changedFiles相同。[构建](./20261005-display-eight-debug-build-01.json)、[索引器测试](./20261005-display-indexer-current-test-01.json)、[原始文件与新artifact比较](./20261005-display-debug-artifact-comparison.json)保留。publication三个helper在同cache成功，来源、完整changedFiles、copiedSource与Cargo.lock SHA记录在runtime私有current-display-verifier-20261005-01/provenance.json。

仅rtd CLI／rtd-indexer-alt／rtd-indexer-alt-graphql发生字节变化；rtd-node、blob writer、consistent、KV writer／Ledger及三个helper保持字节相同。新install_wallet_display_revision.py独立于旧object_versions单文件reload：严格限制D2–D4文件增量及全部三库测试／新旧备份SHA／原进程所有权，保留基础设施及原数据；准备和执行分别落盘，拒绝不确定重复操作。原8个artifact保存在debug-artifacts-before-display-20261005-01；三个helper及11份原绑定另保存在foundation/display-debug-install-20261005-01/original。实际复制使用同目录临时文件和原子rename，全部8个默认debug文件再次逐项校验，installation单独记账；原isolated build的deployedArtifactsReplaced=false不被修改或冒充已部署证明。

首次prepare因query binding的H0实际位于scope.chainId、KV binding为顶层chainId，脚本KeyError中止，未创建操作或发信号；已修复并补两种结构回归。新安装13项加既有生命周期共37项通过。[失败准备](./20261005-display-install-prepare-01.json)、[正确准备](./20261005-display-install-prepare-02.json)、[37项守卫](./20261005-display-install-guards-03.log)保留。

首次apply在核心SIGINT退出身份过渡时报Core identity changed during stop，尚无artifact复制或新launch。随后实际核对核心21240、indexer4762、GraphQL4804均已消失，未断言实际PID复用；保留四个消费者身份一致。新增recover_wallet_display_install.py只接受这个stop-intent且未复制／未启动的阶段，校验旧PID与同命令竞争者均不存在、原端口空闲、源码／构建／绑定／YAML／genesis／备份及保留进程相同；4项拒绝不确定恢复回归与既有合计41项通过。单独inspect后恢复，不重复信号、不强杀。见[失败apply](./20261005-display-install-apply-01.log)、[实际退出复核](./20261005-display-install-stop-observation-01.json)、[停止恢复检查](./20261005-display-install-stopped-inspect-01.json)、[41项守卫](./20261005-display-install-recovery-guards-01.log)、[真实恢复](./20261005-display-install-stopped-apply-01.json)。

核心35590、indexer35614和GraphQL35618已启动；source4756、consistent4792、KV writer16636、Ledger16643、adapter85593、publisher85638均保留。原默认artifact的最新来源guard已接受；实际只读TLS reader能SELECT三个新历史表，各有3项触发器，22条旧watermark保留。此时三个历史表0行，不能称回放完成。见[schema与原管线](./20261005-display-installed-schema-01.json)。publisher实际status healthy=true／running=true，不能据此推断新后缀追平，见[有限status](./20261005-display-publisher-status-01.json)。

## 原链与恢复边界

最初native探针误用SDK根路径而未执行；随后修正为rtd-ts-sdk/packages/typescript。安装前真实15秒486892→486962，原三笔交易回执／余额和H0相同，0模拟／0广播。新核心首次探针在RPC尚未监听时退出；第二次可以读取旧487463，但validator共识恢复尚未结束，15秒未推进，passed=false，ready保持false。恢复日志随后显示旧durable cursor／processed commit目标回放完成；第三次真实15秒487696→487767通过，并核验原三笔回执和余额保持，原YAML／genesis／数据／journal不变，原Fullnode与faucet listener属于新PID，再由指定finalizer设置核心ready=true。见[安装前](./20261005-display-core-before-install-01.json)、[未推进失败](./20261005-display-core-after-install-02.json)、[恢复后原生证明](./20261005-display-core-after-install-03.json)、[核心完成](./20261005-display-core-finalize-01.log)。核心ready不等于钱包可试用。

## 实际有界回放（未完成）

prepare_wallet_display_history_replay.py使用已安装current proof、当前66项测试、原22管线有效配置与认证guard，记录H0／sourceId／generation及adapter／数据库／query binding SHA，实际新原生程序解析replay与resume配置。[准备证明](./20261005-display-history-replay-prepare-01.json)上界386503，仅hist_displays从0回放，没有--first-checkpoint／跳watermark／sum_displays伪造回填。原ingestion、committer、pruner及固定2名额保留；总预算2／2／2，不增加另一个读取cohort。

新增run_wallet_display_history_replay.py：原indexer停后确认PID／同命令竞争者消失，再保留原process／launch intent、旧22条水位；有界child只运行hist，监督进程持有query lifecycle锁并等待真实exitCode。完成时要求同一TLS只读事务中coverage、genesis、sourceId／generation、readerLo0、marker的0..hi连续全集／端点及hist watermark一致，旧22条水位原样；退出0、覆盖准确到准备上界且源码／产物仍一致，才允许恢复原22条加hist live。未知启动和不确定复制／执行不自动重试；6项覆盖准入与既有6项planner守卫通过，见[12项守卫](./20261005-display-replay-lifecycle-guards-01.log)。

回放真实PID66145、监督exec session59830，运行日志[首次启动](./20261005-display-history-replay-run-01.log)。首次只读TLS观察：H0一致、sourceId218fa76ebb0cde8c14d89d0e932fbf3d、generation dev-20261003-01、writerEpoch8、readerLo0；覆盖0–196，197个marker，genesis及末端digest与coverage一致，hist watermark196。真实exitCode尚无，live未恢复；见[首次覆盖观察](./20261005-display-history-replay-status-01.log)。必须继续同一个有界运行，观察超时不能当作进程终态或重跑理由。

## 接下来

完成完整认证前缀回放与旧管线恢复，再验证生产WalletAssetReader同S Display／OriginByte／直接NFT、隐藏资产／非空Kiosk与新版Chrome，及未发布编辑／多Display ID／中断与原子覆盖的实际矩阵。新版UI c017238b／background95f84aae没有继承旧Chrome通过结论；正常CA／host权限和资金模式／NFT转出等合同仍待。所有原成功和不确定交易journal保留，不广播或重跑既有交易；本批全部运行与部署脚本来自指定link-u-smart-contract，原archive文档目录保持。

## 回放期间的实际能力和工具链复核

native GraphQL实际S100返回apiVersion1、V1／V2、源／generation和完整同S coverage；S100000返回错误且不返回能力。新增只读scripts/probe-live-display-history-capability.ts进一步直接调用生产钱包displayHistoryCapability解析实际S100响应，核对query binding／H0／sourceId／generation、同S摘要、首0覆盖和冻结DTO；随后请求本次coverageHi+10000并核验拒绝。2次实际请求、0模拟／0广播通过；覆盖2128仅是当次观察，不代表资产或Chrome。见[生产解析器实测](./20261005-display-live-capability-wallet-parser-01.json)，原native正反响应分别保存为S100／S100000日志。探针pnpm exec esbuild构建通过（SDK既有sideEffects warnings保留），完整tsc exit0；初次直接require esbuild因pnpm间接依赖解析未找到，未运行探针，改用既有pnpm exec流程，无安装或更新依赖。

account三个helper也在同一隔离target以当前源debug成功构建，sourceUnchanged=true，default与isolated三个SHA逐一相同，没有替换文件／进程或伪造旧proof。后续新的account原生认证使用current-display-account-helper-20261005-01/provenance.json；旧证据保留。见[比较](./20261005-display-account-helper-comparison.json)。

为了定位回放速度，现有指定部署维护脚本以不带--apply的方式执行原publication ledger完整前缀SQL：fixedHead386503、sameFixedPrefix=true，两个ANALYZE实测40.424／43.188ms，0 physical read、1485 shared hit、Aggregate/Gather。没有VACUUM／DDL／DML、提高读取cohort或缓存发布准入事实。观察到hist watermark1016、当批日志约4.52 checkpoint/s且无panic／ERROR；此数值是阶段采样，不给出保证完成时间，也不代表全量认证通过。见[只读SQL测量](./20261005-display-replay-publication-sql-profile-01.json)。后续提速必须保留固定版本双副本、完整前缀、前后准入与epoch合同；不能跳过历史或以早期capability通过取代完整资产S。

53项本批部署／恢复／回放／既有守卫、6份脚本py_compile、四仓库diff检查通过；文档13章／14原文／22 QA／21线协议完整性通过，双方3对新增章节逐字相同，190个当前Task／总进度／状态／日志本地链接存在。见[最终53项](./20261005-display-deployment-guards-final.log)、[文档完整性](./20261005-display-deployment-docs-check-01.log)、[章节和链接](../evidence/20261005-display-deployment-document-verification.json)。新增实测探针不修改业务逻辑、已构建扩展或RTD源码。

2026-10-05 04:16最新只读TLS观察：连续0–9440／9441 marker、coverage与watermark同9440、原22水位未改变、PID66145身份一致、无终态退出码。发布器03:56 healthy=false，04:16 healthy=true并有实际verifier子进程；不可把进程在场或单次健康当作已完成pending457546发布。证据：`20261005-display-history-replay-status-03.json`、`20261005-display-publisher-detail-02.json`／`03.json`。后续性能设计见[辅助前缀索引设计](./20261005-publication-prefix-index-design.md)。
