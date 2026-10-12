# 2026-10-07 源端／副本端并行读取 P9 与有限重放扩展准备

81/98，17父项开放，trial_ready=false。当前正式 PG 复用镜像、25 查询命令、两条 debug 链、钱包 C40 产品源码与所有原摘要／pending 保持。候选功能验证通过不等于提速达标或父任务完成。

- [x] P9a：仅基于当前正式镜像生成两文件隔离候选，保持其余函数 AST、SQL／catalog／版本／SHA／复制状态及 TLS 合同。
- [x] P9b：60 项契约测试及15实际SQL／14实际对象检查；失败记录保留，实际检查与模拟 oracle 分开。
- [x] P9c：384 次交错完整读取、收益门槛判断；未达门槛不安装。
- [x] P9d：四只已结束只读临时容器按完整 ID 清理，当前环境与源码独立复核。
- [x] R2a：从现有 publisher cache 独立复制输入，重新核对全前缀发布账本／SHA、可信旧状态谱系及 debug quorum／连续性，拟开放范围的源端／副本端 latest VersionId／复制旗标前后复核。
- [x] R2b：有限服务仅允许认证区间150000–200000与独立证实的历史等价探针0–205，每次重新验证实际 SQL／双端 HEAD／SHA／真实 mTLS 授权；真实旧／新读取、边界拒绝、隔离 native 数据等价验证。
- [ ] R2c：若 R2a／b 成立，仅三个 owned consumer 有限追平；完整保留原命令／独占 writer／require-published-watermark／数据与回滚，再核验14 HBase／23 SQL／4 Rocks、Display、恢复原在线命令和新的明确 ownership 记录。
- [ ] R2d：覆盖后推进 framework180806、原交易写后读176999／177615／198775及实际 Chrome 全合同；名称仍必须覆盖实际 native 当前高度，不用200000固定目标替代。

## 并行候选与真实结果

候选只修改 `visibility.verify` 和 `checkpoints.verify_read`，各完整读取共用最多两个对象工作线程；业务 SQL、catalog、前后 publication snapshot 在调用线程执行。源端和副本端各自保持 HEAD latest／复制旗标→固定版本 marker／boundary GET，再进行同原算法的一致性比较。内部 checkpoint body 的双端固定 GET 及前后 latest HEAD 可以并行；流关闭和 release_conn 保持，异常时等待另一角色清理。不缓存对象、权限或账本事实。

对应官方依据：[MinIO Python 7.2.20](https://github.com/minio/minio-py/blob/7.2.20/docs/API.md)允许线程共享 client，进程仍独立；[urllib3 2.6.3](https://urllib3.readthedocs.io/en/2.6.3/reference/urllib3.connectionpool.html)的 maxsize／block 边界不能混同；[Python Executor.shutdown](https://docs.python.org/3/library/concurrent.futures.html#concurrent.futures.Executor.shutdown)说明上下文退出会等待运行任务。原 HTTP Handler／CHECKS16 与各对象连接池参数均保持。

[60项契约测试02](./20261007-parallel-objects-contract-tests-02.json)通过。该套因 FakeDatabase 只模拟旧 aggregate ledger，明确注入旧 ledger_snapshot oracle；不把这套测试称为当前 prefix ledger 的真实数据库验证。另行[隔离实测02](./20261007-guard-parallel-objects-candidate-02.json)执行15项实际 readonly／verify-full PG池检查、14项实际对象与故障检查，使用镜像实际 prefix ledger。三次完整读每次4个新 catalog／8个HEAD／6个固定GET，全部6个响应关闭并归还；业务 SQL 仅在调用线程执行。

14项对象检查包括8个只在诊断 wrapper 中改变真实响应字段／正文的故障、4个实际错误凭据／CA请求，以及恢复与清理。未改真实对象、SQL表、生产handler或 namespace授权。384次为两只隔离镜像、相同7个只读挂载，2／8／8／2并发各ABBA、16轮各24次，全部200并匹配同一真实205 SHA。

2并发旧15.6249／新14.7376 rps（0.9432倍）；8并发旧19.9359／新20.2477（1.0156倍）。两档均未达到预定≥1.20门槛，readyToInstall=false，**候选未安装**。不能从功能全通过或8并发小差异宣称已加速正式消费。

首轮契约测试因断言把实际 keyword VersionId 当 positional 参数失败，修正测试断言后60项通过。首次实对象诊断硬编码的预期 SHA 只有62字符，导致诊断断言失败；已保存原错误代码／失败报告，正式或候选正文没有因此判定为损坏。第二轮从 baseline 实际正文计算并验证64字符 SHA，15实SQL／14实对象和384读完整通过。独立增量审核首轮把记录中的 boolean 当 integer2 断言，保留失败，改为检查真实 boolean 后[审核02](./20261007-parallel-objects-current-increment-audit-02.json)通过。原失败不改写、不计成功。

## 环境、清理与执行门禁

四只临时 preview 都有实际运行前／停止后完整ID与 compose归属证据、仅 bind只读且无数据卷；SIGINT停止后逐ID删除，独立 docker inspect确认不存在。加上此前已审核26只，累计清理30只确认退役／无数据临时容器。没有全局prune，没有删除卷、镜像、配置、原文件或失败证据；未知PG／HBase继续保留。

[本批环境复核](./20261007-parallel-objects-foundation-audit-01.json)：28正式容器／14healthy，两套TLS只读PG／HBase14／fresh source+replica授权／owned publisher正常。allBusinessServicesReady=false保留。综合独立审核进一步确认正式PG镜像未变、C40源码1119／原25命令／两core保持，父计数81。[C40只读前置02](./20261007-C40-framework-preflight-02.json)共同101942–156486，未达180806；0模拟／签名／Execute，未读keystore、未开Chrome、未创建执行fixture。

## 接下来：有限认证区间，尚未安装

发布器缓存实际存在0–248431，但缓存不授予读取权限。新 R2 输入操作只在私有独立目录复制，完整0–200000以发布SQL行／正文SHA核对两次，验证当前源码 debug verifier与原可信0–75097状态谱系；新增75098–200000独立校验 quorum、previous digest、epoch committee和交易／effects／对象内容，并将 native日志digest／SHA对账到发布行。错误 seed SHA 必须无输出拒绝。

拟提供的服务范围严格限150000–200000及205，初次与最终双端 latest HEAD／VersionId／COMPLETED或REPLICA校验只覆盖这50002个可提供的成员。其余前缀输入用于连续证书证明，**未做双端latest覆盖，也不可由该有限服务读取**；额外复制文件保留在私有目录但不属于成员。每次真实读取仍需 fresh publication SQL、双端最新版本／复制旗标、正文SHA及真实guard mTLS授权；marker直接来自真实guard，不制造 committed marker、不用缓存代替权限。不声称每次重放重新下载副本正文，该有界开发bootstrap合同与在线双正文guard明确分开。

这与[Sui官方Checkpoint Verification](https://docs.sui.io/develop/sui-architecture/checkpoint-verification)的可信创世→委员会证书→previous hash→epoch下一委员会验证一致；官方说明不为RTD本地cache赋予发布权限。RTD实施以当前固定源码和实际编译debug验证器为准。

[R2a实际输入证明01](./20261007-certified-replay-interval-input-01.json)已完成，519.57秒：200001份全前缀输入／SQL／SHA两次完整核对，原0–75097可信完整quorum状态与当前debug新增124903份quorum／连续性通过，native新digest／SHA全部匹配发布账本，错误seed SHA在无输出状态下拒绝。50002个拟提供成员前后各双端latest版本／复制状态检查，合计200008个HEAD；未给其余前缀或额外复制文件赋予读取权限。源码／八debug／原25命令／两core保持，0正式信号和安装。

R2b另行[0–205明确成员证明01](./20261007-certified-replay-interval-probe-membership-01.json)已通过，206份两次逐点SQL／SHA及824个双端HEAD，额外成员有独立证明。最终允许0–205及150000–200000，共50207份，206–149999仍空404。原R2a50002成员证明保持，不改写为新成员总数。

[R2b资格03](./20261007-certified-interval-qualification-03.json)已通过：当前正式guard与新有限服务按ABBA、2并发，各轮24次，共96实际读取，检查0／205／150000／180806／198775／200000的规范正文SHA全部匹配；7个未授权成员／非法路径均空404。真实marker来自guard并覆盖200000，不以本地marker替代。两轮原接口4.234／4.328 rps，新服务9.076／4.973，平均4.281／7.025、观测比值1.641；存在窗口波动，**不声称持续live吞吐提升**，R2c安装后的实际持久推进须另验。

资格02实际已完成独立数据库的当前八debug native回放：indexer自然exit0，23 SQL／4 Rocks到205、全部27业务SQL表逐行等于原认证archive205；生产WalletAssetReader的5个对象ID／版本／digest／owner／BCS内容／前交易及余额与真实归档匹配，Display205覆盖、Fullnode未配置且0请求，模拟resolver明确FeatureUnavailable。真实证据保存在私有`certified-interval-qualification-20261007-02/native-equivalence.json`及对应assets-evidence，资格03明确复用该实际02证据并验证全部原输入SHA保持，**03没有重跑native或重新写数据库**。

首轮资格01在任何点查／native之前误读启动返回字段失败；清理期间僵尸误判及第二轮资格02的ps检查退出竞态各自保留[失败01](./20261007-certified-interval-qualification-failed-01.json)／[失败02](./20261007-certified-interval-qualification-failed-02.json)。02在清理前已经完成native／资产验证，但未先落盘比较样本，不能补造02的96个原始样本或速度。03先落盘比较与清理前证明，处理自身child回收及PID消失竞态，重新实际96次比较；全部三轮的6个独立replay／indexer／consistent／GraphQL PID均确认退出。保留测试数据库和日志，未强杀、未动正式25命令／两core／28容器或原数据。

当前[独立全范围审核01](./20261007-certified-interval-independent-audit-01.json)另核对native新增124903个digest／SHA、明确成员边界、实际02数据等价与03样本／源码保持、6测试进程退出、当前28／14和C40源码1119。R2c的正式消费者有限追平尚未开始；R2a／b是安装前证明，不作为任何新父合同或试用通过。

R2c下一步按[完整C1–C7子清单](./20261007-certified-interval-catchup-design.md)执行，已完成C1真实原三命令／私有ownership保护计划、持久HBase14最低176802及28／14准确容器快照；原SQL23／Rocks4指标分别181561／181562。不同时间观察分别保留，不以已达framework目标的两类指标代替全部十字段共同覆盖。尚未发任何正式信号／启动finite或改变ownership，父计数81不变。
