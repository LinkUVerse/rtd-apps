# 2026-10-05：Display v1 历史索引与覆盖实现

推进 RPC-03／NET-04 的 D2，并预备 D5 的数据库证明。总体仍为48/98、trial_ready=false；历史服务还未部署，D2–D6不据此勾选。实现依据[已核对的发布语义](./20261005-display-history-design.md)，原目录和已有sum_displays消费者保持。

## 本批源码

- rtd-indexer-alt-schema 新增hist_displays、hist_display_checkpoints、hist_display_coverage及可逆schema迁移。每个发布事件保存完整BCS类型、checkpoint／交易／事件位置、交易digest、Display ID、INTEGER发布版本与原事件BCS；按(type ASC,cp DESC,tx DESC,event DESC)索引。版本范围0–65535，链上事件位置全局唯一，不按最高版本或当前ID选模板。
- HistDisplays processor验证checkpoint contents、交易／effects／events摘要对应，识别VersionUpdated而不是DisplayCreated或对象字段编辑。每个checkpoint产出标记，包含事件数量和整个有序事件集合的SHA256；SHA仅用于内部一致性，不冒充认证checkpoint证书。
- 独立coverage从-1开始，只能从genesis连续前进。绑定H0／sourceId／generation，校验checkpoint前驱，保留全部历史；同一事务提交marker、事件、coverage和框架watermark。旧checkpoint重放必须完整marker及全部事件逐字节相同，缺行、多行或内容冲突失败，不忽略冲突。
- 数据库触发器禁止改写／删除／truncate事件和marker；coverage禁止删除、绑定变化、回退、缺endpoint／缺checkpoint／前驱不符／事件数量不符。三个新表加入原Alt epoch fencing；原FOR SHARE promotion锁覆盖整个事务，新epoch promotion须等待已准入事务结束，旧epoch随后不能写入。
- 新管线需显式binding、require-published-watermark和exclusive writer epoch；启动校验自身框架watermark与coverage相等。已有sum_displays水位无法证明或初始化历史覆盖。默认配置不开启历史管线，已运行环境未替换。

## 合约仓库的回放准备

新增all-in-one-deploy/localDeploy/prepare_wallet_display_history_replay.py。它需要当前源码的八个debug产物和真实PG历史测试证明，核对原H0／generation／sourceId／认证adapter／现有indexer身份。只在原foundation中新增独立私有revision，保存原配置和原process记录，生成replay.toml、resume.toml和私有命令计划，用当前原生parser检查两份配置，不发送进程信号、不改查询数据或准入。

有界回放配置仅包含历史管线，保留原摄取并发参数；恢复配置完整保留原管线再加入历史管线。先受控替换原独占writer后才能执行回放；不得在原writer仍运行时增加并行writer／cohort或放宽adapter预算。恢复全部管线前必须证明历史覆盖达到计划through。实际替换、认证回放、运行绑定与准入依赖更新仍属D2／D5／D6后续工作，本批仅证明配置／命令与构建来源守卫。

## 执行证据与实时状态

- `python3 -m unittest test_prepare_wallet_display_history_replay`：首轮5项通过；增加当前源码／八个debug产物守卫后6项通过，见[最终输出](./20261005-display-history-replay-prepare-tests-final.log)。范围为配置保留、管线隔离、绑定参数、独占／认证来源标志和BIGINT边界，未执行实际prepare或原生回放。
- 首次cargo check暴露Digest的AsRef歧义和Message trait导入遗漏，已修正；第二次检查暴露测试闭包的借用生命周期和TransactionDigest歧义，已修正。失败日志[check-01](./20261005-display-history-check-01.log)、[check-02](./20261005-display-history-check-02.log)保留。
- 首次带--locked测试因新增本地依赖需要更新Cargo.lock而未启动；见[tests-01](./20261005-display-history-tests-01.json)。依赖仅使用已有workspace包，离线解析更新，未升级第三方版本。
- 首轮14项历史测试通过且sourceUnchanged=true；补齐DisplayCreated不算发布、BIGINT边界、全局事件位置与配置合并后，用indexer-test模式执行整个索引器库：66项通过，0失败／0忽略／0筛除，sourceUnchanged=true。其中新增19项包含17项历史测试（12项使用实际PostgreSQL17的TempDb）和2项配置测试。见[最终证明](./20261005-display-history-indexer-tests.json)与[完整输出](./20261005-display-history-indexer-tests.log)。这些临时数据库与原开发链数据库隔离。
- `cargo check --locked --offline -j 4 -p rtd-indexer-alt-graphql --lib`通过，见[兼容检查输出](./20261005-display-history-graphql-check.log)。检查schema／索引配置的GraphQL编译兼容，不声称新历史resolver已接入。Rustfmt检查与本批文件git diff --check通过。

新增测试共同涵盖空checkpoint、同cp多事件／多ID、32767／32768／65535、错误发布BCS／events摘要、完整一致重放、冲突拒绝、gap与前驱失败、事务中断回滚、持久边界恢复、缺coverage／错watermark、绑定及版本越界、数据库不可变性、旧epoch暂停／promotion／恢复、successor接续和开启前置门禁。

## 边界与后续

本批没有启动新的rtd dev服务、部署合约、广播交易或修改现有journal。运行环境仍使用前批保存的debug产物；新增历史源码尚未完成当前全量debug重编译／替换。部署source上下文已按预期拒绝旧source proof；该拒绝不会用改写摘要掩盖，后续启动必须重编译并完成受控绑定更新。运行核验另见[只读核验](./20261005-display-history-existing-runtime.json)：只使用原reader身份检查schema和原生授权，不绕过门禁接纳业务查询。首次两次路径核验失败和旧构建拒绝均在结果中保留。现有八个debug文件未替换、六个原生消费者及PID11462授权listener均匹配原记录，core存活；原reader为read-only，三个新表均不存在，单次原生GraphQL授权204。初次误把已退出PID86054的退休快照作为当前listener，原观察另存，已更正为活动listener记录；这些事实不替代历史回放或本批Chrome验收。双方三个章的新实现段落字节一致；首轮追加选错不存在的旧标题和后续缺heading取到整个章的错误已在最终文档校验前更正，旧对齐结果明确superseded保留。历史loader、scope resolver、v1／v2优先与basis、availableRange／NET-04与钱包准入、实际认证checkpoint回放和Chrome完整Display均未实现或未验收。

按[PostgreSQL锁文档](https://www.postgresql.org/docs/17/explicit-locking.html)核对FOR SHARE与promotion更新的冲突及事务结束释放语义；本批实际PG证明的范围为Alt数据库三个历史表与watermark，不将其扩展为MinIO／HBase或多节点安全证明。
