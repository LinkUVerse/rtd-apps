# 当前状态（2026-10-07，C44严格来源后继已安装）

总体 **84/98（85.7%）**，14父项开放，`trial_ready=false`。当前状态更新前完整记录见[前继原字节归档](./20261007-current-state-before-C44-http11-switch.md)，历史原C43资金／pending／M4范围按原链接追溯；本轮只新增已实际验证的C44运行后继和现代查询入口，不将历史旧源码资金验收算给C44。

当前产品1120文件 SHA **1db4c584733b1a85733535c9336b1c7876a5c980171ff47ecb3b394da7ab638d**，production目录`/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261006-03/certified-positive-production-C44-20261007-02`，真实来源 **nbmpcfknfgjmecallhngcincnhklllpj**。NFT详情／转移页共用快照准入：普通挂牌放行，locked／exclusive Listing及OriginByte未登记／独占拒绝；fresh输入／cap／正式模拟和已dispatch原结果保持。旧页面8个业务回归失败、修复后100实际NFT相关测试／生产类型及完整5285模块／2036源码／7chunks审核通过，只有三个运行叶变化；详见[E1–E4设计与精确差异](./20261007-kiosk-transfer-eligibility-design.md)。E5资金和完整非空NFT回归未完成。

[C44严格来源S1–S4／S5a](./20261007-C44-http11-origin-switch-design.md)已实际推进：只加入第13个已实测Origin，原12来源、三现代入口／methods、CA与private mTLS、GraphQL HTTP1.1 guard41980／pool8／native ingress41981不变。[实际切换01](./20261007-positive-C44-http11-edge-switched-01.json)完成新13→旧12／C44新来源403→最终新13共38完整十域同H0查询；[独立01](./20261007-positive-C44-http11-edge-switched-independent-01.json)核实四真实状态／启动时间、38原帧、84三入口规则、三个private CA／client mTLS／localhost SAN与fresh C44查询。原C43 authority／源码／manifest不改，由新的wallet_C44_http11_edge_ownership.py明确继承原333000／283000／200000／boot和八debug运行权威，仅一个已拥有的edge ID／StartedAt变化。

[当前环境01](./20261007-C44-installed-final-environment-01.json)：**29钱包容器运行／14health**、原29进程／HTTP1.1 listener、最新RTD本地八debug、原1015私有文件和当前产品／全部C44产物保持。观察时全局117＝105运行／12退出；额外Java Testcontainers属于其他并行测试，数量动态、未操作，不要求旧110／98总数固定。原FFMB／DEFM／BMWQ pending及GYF执行profiles未打开、复制、清空或重发；所有原fixture／finite创建器不重跑。

[旧C43 HTTP1.1 edge精确清理01](./20261007-retired-C43-http11-edge-cleanup-01.json)及[独立01](./20261007-retired-C43-http11-edge-cleanup-independent-01.json)：成功退出／三个readonly bind／新C44已独立切换回滚确认后，无force一条rm；原完整source／recipe／inspect／logs保留。其他110非Testcontainers配置与启动保持，卷／镜像／数据删除0，累计**43确认退役容器**清理。12未确认退出容器保留；当前临时syntax容器已自动删除；并行测试临时容器不自行判定退役。

[新专用空Chrome01](./20261007-positive-C44-transport-chrome-01.json)及[独立原帧01](./20261007-positive-C44-transport-chrome-independent-01.json)通过：真实C44 UI／worker字节匹配，五manifest origins包含、未知端口不包含；三个现代入口各一次200，GraphQL H0、archive规范完整unary protobuf／status0 trailer（380331）、account实际覆盖。零原profile／可选权限请求／CA变更／模拟／签名／Execute。这是实际Chrome transport范围，**不是普通Chrome系统CA、完整NFT／资金业务或REL-02全入口验收**。安装说明已更新到当前C44目录，原C43说明完整保存。

新C44覆盖观察v1遇到实际非200 assertion失败，但原工具未存原帧、状态码不详，[失败01](./20261007-C44-nonempty-kiosk-readiness-01-failure.json)明确保留缺口，不猜503。[后继v2观察02](./20261007-C44-nonempty-kiosk-readiness-02.json)按C44实际Origin先保存原GraphQL／account帧、只对503/504最多一次额外尝试，此次第一帧200。正式publication **401214**／pending=null，14HBase381122／23SQL381126／4Rocks381126／Display381128、十域381126／account381082；七门槛仍未覆盖新八NFT的**424677**。

当前C44生产读器在共同333000–381543下minimum424677明确coverage拒绝，[独立原响应02](./20261007-C44-nonempty-kiosk-production-readiness-independent-02.json)核实十域／Display与零profile／模拟／签名／Execute。正向库存、E5完整当前Chrome转移和写后刷新未执行。原K1–K4一次新fixture发布／播种、原生八NFT／cap／DF及四ENABLED普通／普通挂牌成功、locked8／exclusive4模拟证据保留；创建器不重跑，也不用旧窗口、native fallback、伪造cache／watermark或降低native-current／minimumCheckpoint／S+20代替验收。

最新[发布阶段02](./20261007-G3-C44-switch-publication-stage-02.json)确认原publisher7463与当前子进程79715（15:56:50启动）仍活，正在下一次工作，正式401214尚未准备新pending；这是真实运行等待，不能仅凭working状态当发布或追赶完成。原账户continuation的optimized debug helper继续保持。持续503/504原因／可用性、普通ChromeCA及剩余14完整父项尚未收口；下一阶段继续正式publication／管线追赶及其性能复核，不停止活的原发布任务或重跑终态finite。


## C44 checkpoint 性能实测与本轮临时回收

[性能P1–P4](./20261007-C44-checkpoint-transport-performance-design.md)已执行并独立核验。实际40.10秒样本native4.264、writer3.441／consistent3.416 cp/s；四次完整读取profiler和八次真实adapter／guard请求，adapter三次空503、guard四次同SHA成功。不能凭此推断唯一根因。两独立只读预览128次完整认证响应及七否定门槛、candidate64次实际16连接通过；吞吐16.018→17.613 req/s，仅1.09956倍、低于1.20，不安装guard／adapter后继、不改变原容量或省略fresh SQL／catalog／两副本校验。

[独立03](./20261007-C44-checkpoint-keepalive-independent-03.json)确认两轮4临时容器精确回收，累计**47**；无force rm／卷／镜像／数据删除，两个成功预览SIGINT后exit130。首轮baseline stop超时退出137及模块路径失败、独立工具两次错误均原样保留。12未知退出与其他测试容器未动。[最终环境02](./20261007-C44-performance-final-environment-02.json)继续29／14、八debug／原进程和1015私有文件／1120产品保持；全局此刻110＝98运行／12退出，动态数量不作为固定准入。

[覆盖03](./20261007-C44-nonempty-kiosk-readiness-03.json)正式publication401214／pending=null，HBase386440／SQL386442／Rocks386442／Display386445／十域386444／account386430，424677七門檻仍未齐。[原publisher当前子阶段](./20261007-G3-C44-publisher-child-phase-01.json)through434325、CPU65.9%、运行35分18秒，只是诊断；原7463／79715仍活且不终止、不重跑。下一阶段核对正式publication推进及持久管线追赶，完整NFT／名称native-current／普通CA和剩余14父项继续开放。84/98、trial_ready=false保持。


## 正式发布命名空间与扫描工具修复

[N1／N2](./20261007-C44-namespace-diagnostics-01.json)完成：当前原工作子与私有原生样本核对，原前缀／命名空间7测试及实际驱动4回归通过。完整枚举v2在第二个10000进度点因O_EXCL同名记录失败；原失败保留，v3改为按count保留不可覆盖收据，独立03完整枚举仍进行。仅namespace调用变化的候选已准备／16实际AST调用测试通过，尚无完整真实收据、未安装，N3–N5与父项保持开放。

[本轮环境](./20261007-C44-namespace-current-environment-01.json)29钱包容器运行／14health、原进程与最新八debug及1015私有文件／1120产品保持；实际全局110／98运行／12退出。累计47退役容器已清理，本轮无新增容器或额外清理，12未知退出保留。[当前SQL](./20261007-G3-C44-namespace-publication-stage-02.json)published401214／pending434325／prepared尾0行。[覆盖04](./20261007-C44-nonempty-kiosk-readiness-04.json)HBase392109／SQL392112／Rocks392114／Display与十域392113／account392100，424677七门槛均未齐；诊断224256／401215不是发布。完整NFT资金／名称native-current／普通CA及14父项继续，84/98、trial_ready=false保持。
