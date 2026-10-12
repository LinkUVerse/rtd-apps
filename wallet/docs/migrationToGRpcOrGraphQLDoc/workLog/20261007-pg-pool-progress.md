# 当前G3 PostgreSQL传输复用与冷启动绑定

总父任务仍81/98，17开放，trial_ready=false；钱包当前C40的1119产品文件和既有完整测试／生产产物不变。本批为实际后端传输编码、隔离验证、单组件部署及两scope冷启动元数据补齐，不替代NFT／名称最新覆盖或任何未完成父任务。

[原30秒消费测量](./20261007-current-catchup-performance-01.json)native4.579、writer4.247／consistent4.338 cps。P1实际guard身份verify-full／readonly SQL，[12组建连与完整读取配对](./20261007-guard-postgres-transport-baseline-01.json)中位完整checkpoint205为265.39→129.48ms；直接容器内调用不包含incoming mTLS／pool开销，不直接当消费者收益。

已编码postgres_transport.py有界16单身份pool、3s借用等待／30s配置lifetime／15s配置idle、借出前检查、正常DISCARD ALL／只IDLE归还、失败或取消丢弃、不重放业务查询、CA bytes／路径／角色／scope变化或初始化后跨PID拒绝；每次LOGIN／validUntil、readonly／TLS重新检查。每次ledger/catalog／HEAD／VersionId／source及replica bytes与SHA校验保持。固定官方psycopg_pool3.2.8，wheel完整SHA5474137f3a58e697e0141d0311e70ec067fc4466031496d7f9ef3e2c28a1dc09已核对；原镜像、源文件和失败材料均私有保留。现存认证会话不声称每次新握手；密码或服务端证书撤销需受控关闭会话，身份或CA文件变化则本实现立即拒绝借用。

[旧50测试](./20261007-guard-pg-transport-unit-01.json)及[旧14真实SQL/TLS](./20261007-guard-pg-pool-real-sql-01.json)通过有限合同；首轮全路径在基线第一组断言失败，未采集到完整逐请求状态，不猜测原因。第二轮[192逐请求保留](./20261007-guard-pg-pool-candidate-02.json)基线96全部200、候选仅66个200／30个empty503，readyToInstall=false。随后[实际20连续读诊断](./20261007-guard-pg-pool-prepared-diagnostic-01.json)复现6次InvalidSqlStatementName／SQLSTATE26000：DISCARD ALL清除服务端statement，而默认自动准备客户端引用仍留。按官方API将prepare_threshold明确设None，并拒绝仍启用准备的借出连接。

当前[51测试](./20261007-guard-pg-transport-unit-02.json)及[第三轮候选](./20261007-guard-pg-pool-candidate-03.json)15实SQL／20连续完整读／192两并发ABBA交错全200通过；基线5.897、候选12.190 req/s，2.067倍观察值。实际角色／TLS／readonly写拒绝、脏事务／异常socket丢弃、setting reset、错CA/SAN、实时catalog负例和16实际并发连接通过。候选继承原不可变G3镜像，只两个原文件调用点／依赖变化及新增模块，其余五原文件（含prefix proof、prefix算法、visibility／server）字节及base layers／runtime imageConfig保持；CHECKS16／adapter12／三consumer各4不变。

三个专用preview已经精确停止／移除，外部foundation network、数据卷、镜像和配置均保留；其他network-none/one-off镜像诊断均使用--rm自动退出删除。first/second Dockerfile构建及第三镜像非root文件读取错误保留；最终构建使用已核对的原本地base tag、build阶段root安装依赖、runtime恢复原10001:10001，源模块镜像0644／私有构建文件0600。累计退役旧loopback仍21；另3个本批明确stateless preview已清理，无global prune／volume/image删除。

只有第三轮达标才[单G3 guard安装](./20261007-guard-pg-pool-install-01.json)，revision e3607f50-d409-4a58-8f0f-062991f28870，当前不可变image46fb5f0bda93eaadc6f99f40d17e5326dd51aa16d9f9511e9661fafa21559e0c。原27容器、25查询命令、两个当前源码八debug核心与两个publisher均保持；原配置/身份/证书文件完整，回退pointer/compose/image/inspect留存。安装后20 exact certified205全200及fresh权威通过；普通Chrome CA／权限确认不在本批变更范围。

独立[环境后验](./20261007-pg-pool-foundation-audit-01.json)28容器／14healthy／两SQL TLS／两持久HBase14／两正式发布授权与publisher通过。[持久在线后验](./20261007-pg-pool-online-audit-01.json)HBase最低136955／SQL23最低142168／Rocks4最低142166，consistent101942–142169，来源／Display／原25命令及debug保持。当前[真实C40 Chrome12项](./20261007-pg-pool-C40-history-chrome-01.json)UI和worker原产物、四角色实资产和非空历史、六partial/global coverage旗标、完整journal／正常relock保持，0模拟／签名／Execute。此前15原交易native审核仍为相同原交易证据，本批没有重新声称新的独立native逐项审核。

冷启动审计发现canonical checkpoints调用点变化会使两adapter原source pin失败，遂[完整同步十启动元数据](./20261007-pg-pool-adapter-startup-rebind-01.json)：adapter config／manifest、两个stack binding及KV manifest，私有十before保留。两launcher只增加postgres_transport源码inventory，consumer_proxy／visibility字节和CHECKPOINT_PATH AST保持，原URL／CA／身份／port／permits／25正在运行命令不变。新进程在原venv实际cold import通过，pool尚未初始化／0DB连接；[两份隔离adapter实际cold启动](./20261007-pg-pool-adapter-cold-start-01.json)原CA和新source manifests通过，4次HTTP→真实mTLS固定205一致／4非法path拒绝，只有两个测试child收到SIGINT并退出。不是完整再次host重启或原adapter重启验收。canonical Dockerfile及指定LD guard镜像source校验均补上新模块，未重新部署完整foundation。

[安装后的33.22秒测量](./20261007-pg-pool-catchup-performance-01.json)native4.576、writer／consistent4.275 cps，未观察到足以追赶的速率改善，不能将守卫HTTP单点提速等同积压解决。[真实十字段窗口](./20261007-pg-pool-framework-prerequisite-01.json)101942–136906、target180806、ready=false。P7完整覆盖继续；优先定位原41891 adapter／原12许可与三个实际remote-store请求的耗时、真实catchup checkpoint路径和collector持久推进，再按证据决定下一次编码。名称当前高度与20 checkpoint新鲜度不放宽，不改链checkpoint间隔、不清水位或旧journal，不重发任何旧摘要。

原三次preview、全部失败镜像/原日志/私有profiles和回退材料保留，各证据按自己的source/image解释。没有依据继续清理的旧PG初始化或其他项目容器保持。

[独立本批总审核](./20261007-pg-pool-current-increment-audit-01.json)已通过：实际current image全部8文件／51测试来源、原28容器和25命令、两个adapter的4 source及launcher／stack绑定／KV manifest、C40源码1119及81/98、三个preview完整ID确实不存在。原launcher manifest三测试通过；[文件与文档审核](./20261007-pg-pool-files-and-docs-verification-01.json)14个相关Python编译、两目录技术段落一致、30个本地新链接与三仓各自diff --check通过。
