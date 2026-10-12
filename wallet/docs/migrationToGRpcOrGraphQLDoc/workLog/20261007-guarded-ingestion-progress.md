# 2026-10-07 发布门禁分段诊断及当前 C40 后续验收准备

本批按已授权迁移目标继续；81/98、17父项开放、trial_ready=false。基础环境复核与隔离候选测试不能替代各父项完整业务验收。本批没有修改 RTD 源码、正式 guard 镜像、consumer 参数、链配置、证书信任、任何已派发摘要或原 journal。

- [x] 分段只读诊断与独立计数复核。
- [x] 实际持久消费观测。
- [x] 隔离有界 TLS 候选及同条件吞吐／实际认证测试。
- [x] 两只已结束测试容器精确清理、当前中间件复核。
- [x] C40 framework 单次执行工具及实际只读 preflight。
- [ ] framework placement180806、写后读176999／177615／198775、名称当前 native 高度新鲜度及剩余父项完整验收。

## 诊断与消费证据

[分段原始观察02](./20261007-guarded-ingestion-stages-02.json)记录8批、每批8次 marker→checkpoint 尝试，guard32次配对全部成功，额外 adapter32次尝试均在 marker 阶段收到空503。正确的配对 HTTP 请求数为96，另有2次建立预期字节的 setup 请求；首次 stdout 的128是计划上限，已经[独立计算审核](./20261007-guarded-ingestion-observation-audit-01.json)纠正，原观察文件及其 SHA 保持。

9.712秒内 native writer／indexer／consistent 分别完成45／49／50个新的实际 fetch，重试计数增量为0；平均完整 fetch0.876／0.788／0.780秒。单独诊断进程的8次原算法读取全部成功，各项 SQL／catalog／source+replica HEAD／固定版本 GET／body 分段已保留。该诊断进程只委托原始算法，不修改正式 handler；catalog.total 与子 SQL 耗时重叠，不能简单相加。最后60秒记录1833个实际 checkpoint 操作，全200；它包括 marker 和数据请求，不等于1833个新检查点。

首轮诊断因 adapter 没有成功样本而无法求中位数，汇总失败；当时没有保存完整逐请求状态，不补造计数。失败代码和原因保存在私有操作目录，第二轮改为明确 null 中位数并成功保存原始观察。诊断成功仅指记录完整，不表示额外 adapter 请求已通过。

[34.02秒持久观测01](./20261007-guarded-ingestion-catchup-observation-01.json)中，writer14最低152747→152922、consistent4最低157991→158166，均约5.143 cps，native 约4.467 cps。它是一次窗口，不能推导持续吞吐保证或全部积压已解决；此前33.22秒4.275<4.576的观察仍作为历史保留。

[33.05秒独立观测02](./20261007-guarded-ingestion-catchup-observation-02.json)中，writer／consistent约5.869／5.899 cps，native约4.659 cps。两次观察首末UTC时间间隔444.948秒，链头实际增2045，writer最低增2368、consistent最低增2363，缺口分别缩小323／318。这是所观察区间的推进证据，不保证区间中每一秒的速率，更不能称积压已消除；不同helper进程的monotonic原点不相同，跨进程计算只使用带时区的UTC时间。

[最新在线独立审核](./20261007-ingestion-stage-online-audit-01.json)实查14条HBase最低155480、23条SQL最低160700、4条Rocks最低160699；保留Display谱系与fresh发布准入成立，正式三consumer原命令不变。审核的75097是历史有限重放目标，不把它改称framework180806或最新NFT转移198775已覆盖。[本批综合独立审核](./20261007-ingestion-stage-current-increment-audit-01.json)进一步核对当前28容器／14healthy、未安装候选、两preview完整ID已不存在、C40源码1119及原25命令／两core，81/98保持。

[额外非法路径观察](./20261007-adapter-backpressure-observation-01.json)20次得到19空503／1空404，其中15次前后均观察到12条到原 guard 的已建立连接。非法路径在 consumer_proxy 中取得名额后会在访问后端之前直接404，结果支持非阻塞名额拒绝；lsof与请求之间存在竞态，未在原进程插入 semaphore 仪表，不声称分类了此前所有503，也未据此重启或扩容。

## TLS 候选：完成测试，未安装

现用 server 在 SSL 包装的 listener.accept 阶段握手。按[Python SSL文档](https://docs.python.org/3/library/ssl.html#ssl.SSLContext.wrap_socket)与[ThreadingMixIn文档](https://docs.python.org/3/library/socketserver.html#socketserver.ThreadingMixIn)设计隔离候选：原强制双向证书认证移入最多32个工作线程，在进入原 HTTP Handler 前完成；单连接5秒读／握手超时。原 CHECKS16、Handler/current_visibility/visibility_metrics AST、fresh SQL／catalog／权限／ledger／source+replica／版本／SHA 校验全部保持。未引入 HTTP 响应或发布事实缓存，也未改变当前正式服务。

[实际候选对比](./20261007-guard-threaded-tls-candidate-01.json)是两只隔离镜像，同网络／依赖／9个只读挂载，按2／8／8／2并发、各档ABBA、384次完整205读取，全部200且原SHA相同。2并发旧14.533／新14.272 rps（0.982倍），8并发旧20.933／新22.576 rps（1.079倍）；两档均未达到预定≥1.20门槛，readyToInstall=false。不能从8并发小幅差异确认生产瓶颈已解决。

另外9项真实 TLS 测试通过：慢握手不堵正常认证请求、无客户端证书／错误SAN／系统CA拒绝、明文拒绝、32名额及第33条关闭、5秒超时释放、超时后恢复、配置禁止可选客户端认证。只在容器中的另一个临时测试 server 检查私有 semaphore，不对正式进程插桩。原TLS最低版本／强制认证不放宽。首次用系统Python启动准备工具缺psycopg且未创建操作目录；改用既有publisher-venv后成功，未安装额外运行时。

候选生成／对比工具均在指定 link-u-smart-contract/all-in-one-deploy/localDeploy 中。原生产镜像仍为PG复用05；候选仅私有操作目录与本地未安装镜像。两只 preview 已校验完整ID、image、compose标签、挂载只读及无数据卷，SIGINT停止后逐ID删除；未强删、未删卷／镜像／源文件。加上此前21只退役入口和3只PG preview，确认清理的只读无数据容器累计26只；未知旧PG／HBase等继续保留。

## 当前 C40 framework 预检

新工具 scripts/test-current-positive-C40-framework-execution.cjs 使用当前 C40 build／闭包／Origin，保留 C39 历史工具和全部原执行证明。新增 --preflight 在创建私有 fixture／访问 keystore／启动 Chrome 之前，校验十字段覆盖、25原命令／两core／最新八debug、实际 native H0及原 NFT wrapper。真正执行仍需十字段共同覆盖180806；私有 attempt 在单次按钮点击前独占创建并fsync，禁止自动重试或再次派发。

[实际C40 preflight01](./20261007-C40-framework-preflight-01.json)成功记录共同101942–154298、ready=false；native NFT仍在原framework wrapper，0模拟／签名／Execute、未打开Chrome或keystore、未创建执行profile。该结果没有完成K3。Node语法与顺序边界核对通过，不等于实际执行或链上审核通过。

[清理后环境复核](./20261007-ingestion-stage-foundation-audit-01.json)：28当前容器运行、14 healthcheck healthy，两套TLS PostgreSQL实际只读与HBase14／fresh source+replica发布准入／两owned publisher／25原查询命令成立，allBusinessServicesReady=false明确保留。C40产品源码1119文件及已有原pending不变；普通Chrome CA／权限、名称正面和完整发布仍未新增验收。

下一步先核对最新持久推进和目标覆盖，覆盖达到后依次做framework真实卡片／内容／pending竞争／受控单次转出、独立原摘要审核及写后读；名称四范围仍必须达到实际native当前高度，禁止用native字段或旧fixture覆盖替代。后续提速候选继续采用隔离实测及完整拒绝校验，未达标不安装。
