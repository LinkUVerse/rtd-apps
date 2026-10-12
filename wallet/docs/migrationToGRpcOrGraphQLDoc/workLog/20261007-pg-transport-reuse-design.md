# 索引追赶的 PostgreSQL 传输复用 P1–P7

上一轮QA-A22完成属于progress。当前十字段127869未达framework180806；[30秒实测](./20261007-current-catchup-performance-01.json)native4.579 cps、writer4.247／consistent4.338 cps，消费仍略低于产生速度。原生consumer CPU较低，G3 PG123.75%／MinIO63.35%／guard60.87%是该时间点实际值，不将CPU单样本当唯一因果。当前read_checkpoint每请求psycopg.connect，固定verify-full／readonly身份；所有snapshot/catalog/权限/source/replica/VersionId/SHA完整验证不得缓存。

- [x] P1：只读精确TLS SQL建连vs同连接查询基准，确认消耗；正常fresh授权、原prefix/current guard来源与原始状态保持。
- [x] P2：复用官方psycopg_pool的有界连接池，保持verify-full/readonly/固定身份、CA bytes/PID隔离、短连接生命周期；借出前检查、正常归还仅IDLE、异常丢弃／不重放查询、交易与catalog每次重新校验。无checkpoint/body/watermark缓存，池配置不得无限放大CHECKS。
- [x] P3：测试角色／endpoint／CA变化、非法CA拒绝、PID变化不继承pool、并发容量／归还／异常／dirty transaction；原guard全部合同与真实PG只读TLS／freshcatalog拒绝不退化。
- [x] P4：当前guard不可变image为基础隔离candidate，只有允许的传输模块／调用点／依赖差异，保留原七文件完整备份，prefix proof及其余五个原镜像文件字节保持；现有guard16／adapter12／三个原consumer不改，单独preview使用新端口，确认真实门禁及相同固定205 bytes。
- [x] P5：实际交错baseline/candidate全路径和并发读取、全部负例／fresh认证比较；取得实际稳定收益且正确门禁后才允许单一owned guard revision切换。无收益则不安装，及时精确清理preview容器，保留image／配置／证明。
- [x] P6：若P5通过，受控仅替换G3 guard，不动原链／cores／25命令／data／两publisher；原compose/image私有保留、当前窗口和readiness错误／恢复如实核对。
- [ ] P7：安装后持续durable14HBase／23SQL／4Rocks、四角色／资产／当前生产UI、目标checkpoint覆盖再验。吞吐优化不是直接业务完成；全部父仍按98清单。

依据：[Psycopg官方连接池](https://www.psycopg.org/psycopg3/docs/advanced/pool.html)明确建连成本与复用后的IDLE／reset；[API](https://www.psycopg.org/psycopg3/docs/api/pool.html)定义有界容量／timeout／check／reset／lifetime。Sui官方[数据访问](https://docs.sui.io/develop/accessing-data/)保留gRPC实时点查／GraphQL组合查询与自定义索引职责；本批不放宽名称当前高度覆盖或20新checkpoint门槛，不修改RTD协议／debug来源／wallet产品。

不删除卷／镜像或failed evidence，不安装CA，不改watermark，不重发交易。官方package版本和镜像实际构建须固定而非拉latest。设计为经测量后的候选；没有测量不能声称提高追赶速度。


P1–P6实际终态见[完整日志](./20261007-pg-pool-progress.md)。P3旧50／14为修复前有限证据；当前51单测／15实SQL（包括20连续完整读）通过。P5第三轮192次两并发交错全200，候选12.190 vs基线5.897 req/s、2.067倍；第二轮候选30个empty503未达安装门槛，原SQLSTATE26000诊断和失败镜像保留。第三轮达标之后仅安装G3 guard，运行20完整读／独立28容器及当前C40 Chrome12项通过。

P7仍开放：33.22秒实际writer4.275 cps／native4.576 cps，没有证明持续追赶速率提升；十字段136906未达180806。已完成P7a环境／UI有限后验与两个adapter源码绑定、十启动元数据及真实隔离cold启动，不将其替代P7b全部依赖目标覆盖。新增P8后续只读诊断应比较当前guard与原owned41891 adapter、旧205与真实当前已认证checkpoint，并核对三consumer请求/重试/队列及持久推进；确认瓶颈后再设计下一次受控变更，不改协议checkpoint间隔或放宽名称覆盖。

## P8 分段诊断及隔离候选后验

- [x] P8a：实际 marker→checkpoint 请求、SQL／fresh catalog／source+replica 分段、三个 native 消费完成／重试计数只读记录，并独立核算请求数。
- [x] P8b：同条件旧／新镜像 TLS 候选、慢握手／证书／连接上限真实测试，保留未达到安装门槛的结果，精确清理仅只读临时容器。
- [x] P8c：当前 C40 framework 工具与只读 preflight，当前八 debug／25 查询命令／两 core／H0／原 NFT wrapper 和十依赖门禁核对；未达到 placement 覆盖不得访问私钥或启动执行。
- [ ] P8d：后续优化须独立实测达标后才进入受控安装；完整目标覆盖及 P7b 仍待。

## P9及有限认证重放区间

[P9完整日志及R2a–d实施清单](./20261007-parallel-objects-progress.md)：两角色对象并行60契约／15实SQL／14实对象、384同条件读取已完成，吞吐0.9432／1.0156倍未达门槛，候选未安装。四只只读preview精确清理，累计30；当前28容器／14healthy与原25命令／两core／C40源码保持，81/98不变。下一步R2为独立认证150000–200000有限区间及205探针，发布器缓存只能作未可信输入；完整证书／SQL／SHA和实际双端latest／每次真实授权须成立后才考虑受控三consumer追平。R2a／b实际已完成完整认证及96点查／7拒绝、独立debug23 SQL／4 Rocks205和27表／生产5对象等价；三轮6独立进程均已退出，R2c正式追平和完整业务覆盖仍待。

见[完整诊断日志](./20261007-guarded-ingestion-progress.md)。384 次隔离对比零错误，但 TLS 候选仅0.982／1.079倍，未达两个并发档均≥1.20的门槛，未改正式服务。9项 TLS 测试只接受候选传输合同，不能当作其吞吐改善；两只临时容器已精确删除，镜像和全部原始证据保留。

会话每次借出及归还后重新核对LOGIN／validUntil／readonly／TLS／角色，正常只IDLE且DISCARD ALL，自动prepared statements明确关闭。固定psycopg_pool3.2.8／wheel SHA5474137f…；短lifetime是传输资源约束，密码／服务端证书撤销仍须受控关闭旧连接或重启，不能宣称现存TLS会话每次重新握手认证。信任文件或身份变更及已初始化pool跨PID均拒绝；每次全部数据／catalog／VersionId/SHA证明保持新鲜。[Psycopg prepared statement官方接口](https://www.psycopg.org/psycopg3/docs/advanced/prepare.html)支持prepare_threshold=None。
