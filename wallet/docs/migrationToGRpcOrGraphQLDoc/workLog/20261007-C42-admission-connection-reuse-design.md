# C42 授权连接复用隔离对比

QA-20限定子项；84/98与父门槛保持。原nginx实际有Docker到host41892/authorize两秒TCP连接超时，503/504尚未修复。宿主监听队列瞬时0/0/32，不能证明持续可用或归因队列。

- [x] C1：保护最新源码/eight debug、28容器、两core/两publisher、22查询及当前333000三finite与replay；固定原admission配置/源码/原server-client TLS证书hash，确认41980/41981未使用。
- [x] C2：新增私有launcher，只改变HTTP/1.1；32backlog与旧launcher相同。加载原已绑定guard及相同config，8检查/32请求/5秒排队/12秒检查及所有publication/index/H0门槛保持。新loopback41980自有进程，不修改旧监听器/manifest或guard。
- [x] C3：独立临时nginx项目，TLS双向认证、127.0.0.1:41981唯一端口，只代理GraphQL，每次fresh授权；一条lane配置复用新HTTP/1.1授权连接，另一条不复用原41892授权连接。相同实际41840后端，不缓存授权结果、不改timeout、不改原容器/网络/配置。
- [x] C4：实际完整HTTP按baseline/candidate/candidate/baseline分别记录，同H0和实际serviceConfig/范围；真实403/503/504与超时均保留，missing-client-cert/非法路径拒绝。小范围比较不得称根因已修复或持续可用，不安装线上后继。
- [x] C5：只回收本操作创建、精确PID/command和唯一compose project已确认的进程/容器，保留配置/日志、0卷/镜像/原服务删除；复核全部保护身份和hash。

当前333000 finite继续运行，不修改任何已pin的原源码、产物或服务。本候选只是可逆隔离对比；完整资格和明确后继计划完成前，不替换在线服务。

## 限定观察完成，未安装线上后继

[第三轮真实观察](./20261007-C42-admission-connection-reuse-03.json)及[独立审核01](./20261007-C42-admission-connection-reuse-independent-01.json)通过：同镜像、原source-pinned Handler/8检查32请求不变，新类只设置HTTP/1.1；两个mTLS lane每次fresh授权，共96请求，baseline48和candidate48均200且同H0、实际availableRange完整保留；三实际阴性请求缺client证书、非法public authorize、错误Origin拒绝。四轮各24请求、并发8，耗时baseline4.232/3.775秒，candidate3.397/3.362秒。并行索引、warming与时变水位影响比较，不宣称稳定加速或根因修复。复用配置已核验，实际TCP复用次数未测。

第一轮01在nginx启动阶段失败，没有留退出错误日志，不反推已定位原因；源码补全三临时目录后第二轮02仍失败，实际日志显示map_hash_bucket_size错误；v3显式128后才成功。01/02失败、各自原版本源文件和记录保留，未作为业务通过。第三轮完整容器日志、初末state/启动身份保留。

仅移除本操作三个明确创建且确认不再使用的容器及各自listener，配置、日志、CA保留，0卷/镜像/原服务删除。独立审核确认原28容器/14healthy与30保护/finite/replay身份、最新源debug/config全部不变。累计确认退役36，其他已有14exited不据状态批量清理。

C1–C5仅限定隔离观察及回收完成。rootCauseResolved=false、sustainedAvailabilityAccepted=false、liveInstalled=false；原真实503/504及QA-20父项继续开放。
