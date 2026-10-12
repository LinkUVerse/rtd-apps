# 认证前缀索引：编码、独立PG与实际部署

2026-10-05，父项D5／D6、NET-11；98项分母及48项完成保持，trial_ready=false。

## 实现与真实验证

原取块每次四次全前缀count／min／max／sum，单次40–43ms。`prefix_ledger.py`每次独立只读事务验证冻结catalog摘要并按认证chain head精确查前缀；`publication_prefix_schema.py`建立原表外键、前驱累计外键和行内算术约束，用立即FK归纳保证完整0..S与SUM。AFTER INSERT在同事务补下一行；失败回滚原行。普通publisher不拥有辅助表写入／禁用触发器权限，函数固定search_path。关键catalog xmin与ACCESS SHARE锁拒绝禁用恢复／对象替换／DDL竞态。源副本和所有固定版本验证仍逐次执行，无认证结论缓存。

指定合约仓库提供`verify_wallet_prefix_index_pg.py`、`install_wallet_publication_prefix_index.py`、`make_wallet_prefix_guard_overlay.py`、`upgrade_wallet_prefix_guard.py`及`finalize_wallet_prefix_guard.py`，原三个adapter主机文件和manifest不变。镜像只替换一个函数体，其余AST相同；实际derived文件及原image层／文件完整保存。独立PG26测试覆盖缺口、错误total、原行删除／rekey／交易数修改、辅助缺失、回滚、并发、权限／触发器／函数／FK漂移、DDL锁及精确大数；包括12组原／新算法真实PG读取故障差分。测试数据库和角色均已清理。

证据：`20261005-prefix-index-real-pg-tests.log`（26）、`20261005-prefix-guard-image-tests.log`（24）、`20261005-prefix-guard-host-tests.log`（32含真实TLS）、`20261005-prefix-deployment-unit-tests.log`（7）。不是97项独立业务用例；测试范围分别限定。

## 安装与保留

独立辅助DDL实际安装17.904秒。事务锁定原表／链状态，431328原行逐行SHA前后同`90b20e4a852fa6fee82db4e33a6907aeb585245ea7ffacc3aa26dd502e41c78a`，全部chain列值相同；逐scope新累计和原完整聚合一致。认证上界386503，pending目标457546保持；辅助索引包含已入账但尚未发布的尾部，读者只能按active published_hi读，辅助尾部不扩大认证范围。只读TLS reader与旧准确facts相同。原表数据格式、存储版本、epoch及journal保持。

候选镜像`sha256:cbc2a7ec8f5a91bef6c87dc3c482e512cb9a105e566b83eb3af0d5a40ac72ff7`，基础镜像层一致，0／100／386503固定版本SHA及未来／非法路径拒绝通过。安装revision `1cfa6838-e986-4ee7-98d7-1c688d131231`。应用初次紧随container up的mTLS请求发生URLError，失败保存；确认既定镜像和revision后，单独finalizer只读核验成功（没有额外生命周期动作或再次切换）。实际准入、源／副本、genesis／head SHA、未来／非法路径、缺客户端证书拒绝通过。

私有操作目录：`publication-foundation/prefix-index-tests-20261005-04`、`prefix-index-install-20261005-01`和`prefix-guard-upgrade-20261005-02`。公开日志：`20261005-publication-prefix-index-install-01.log`、`20261005-prefix-guard-build-02.log`、`20261005-prefix-guard-apply-02.log`（失败保留）及`20261005-prefix-guard-finalize-02.log`。guard8、adapter6、三消费者各2保持，消费者0重启、0模拟／0广播。

## 吞吐与回放

在同一有界回放期间，对checkpoint100的12次只读请求，旧guard12/12、中位0.486491秒，新guard12/12且固定SHA一致、中位0.301633秒，约1.61倍；此数包含运维来源检查和请求耗时，不推断全链吞吐或长期稳定性。前后证据为`20261005-prefix-guard-before-timing.json`和`20261005-prefix-guard-after-timing.json`。

04:30:31最新只读TLS观察连续0..13353／13354 marker，coverage与watermark一致、H0／sourceId／generation一致、原22水位未变、原PID66145继续运行；上界386503、没有有界终态退出码。逐次连续观察保存`20261005-prefix-replay-continuity-observations.jsonl`，终态及恢复live、共同资产窗口、完整Display／Chrome仍待。原八debug与当前RTD source proof保持，本次没有修改RTD源码或钱包业务代码。

## 保留失败和修正

首个独立PG启动因autocommit参数重复提前失败；确认未创建测试库后，修正且使用新操作目录。第二轮新增差分测试因动态dataclass模块未登记失败，实际测试库／角色清理；修正后26项全部通过。候选镜像首轮legacy mock运行误以/app为路径首位且消费TLS测试缺openssl，构建验证失败、没有部署；改为/tests明确运行24项旧算法回归，主机完整32项TLS测试，镜像实际indexed PG探测单列，使用新目录。首次guard切换监听未就绪失败与后续只读终验分别保留，不覆盖失败或重做安装。

双方端点／网络／验收三组章节新增同文段，权威PG资料与设计见[设计及P1–P6](./20261005-publication-prefix-index-design.md)。这不证明多节点提交fencing、完整账户历史、全部资金模式或新版Chrome可试用；父任务未勾选。

后续04:32:53→04:34:54五次实际观察：14526→15581，每30秒约8.66–8.80 checkpoint/s；原22水位／H0／sourceId／generation／原PID保持，无退出码。单次镜像内只读阶段诊断total91.1ms，四次catalog均实查（2.18–8.33ms）；记录`20261005-prefix-guard-phase-profile-01.json`。不是全链稳定性或回放终态。

收尾验证：四仓库git diff --check通过，10个新增源码／测试文件逐行空白扫描通过、运维脚本py_compile通过；13章／14原文／22QA／21wire文档校验通过，三组配对段完全相同、82条本批本地文档链接有效（不把迁移前历史源码定位当成本批当前代码验收）。整合证据见[本批进度证明](../evidence/20261005-publication-prefix-index-progress.json)。下一步以原supervisor真实退出码／完整386503覆盖与原22水位不变证明为准恢复live，随后重新验证生产资产共同S、Display与新版Chrome。
