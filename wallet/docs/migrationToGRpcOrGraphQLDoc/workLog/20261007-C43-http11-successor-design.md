# C43 GraphQL 鉴权 HTTP/1.1 正式后继

上一轮400＋272原始查询及独立TCP计数已证明连接复用实际发生；短连接四次鉴权TCP connect timeout未进入guard。同监听器对照耗时接近，因此本项是传输机制修复与有限运行核验，不宣称根因或持续可用已验收。QA-A20等父项保持开放。

- [x] H1：核验当前最新RTD源码／八debug／第三后继，原25查询＋2core＋2publisher、28容器14健康与全局资源；固定原C43源／产物、两个原鉴权及配置／证书，不改原authority。
- [x] H2：新增独立正式HTTP/1.1启动器，唯一41980／新私有state，继承原Handler仅切换协议，原8checks／32admitted／backlog32／5s等待／12scheck不变。单socket先允许后拒绝的定向协议测试验证每次fresh检查与Content-Length，不缓存成功；补精确boot恢复，活进程／同boot退出不得冒充重启后可恢复。
- [x] H3：新增同镜像私有mTLS GraphQL ingress41981，upstream keepalive8／2sconnect／20sread、原41840 backend及visible checkpoint不变。实际完整十域／H0、无client cert／错误Origin／公开authorize负例；仅暂停本次新鉴权进程，已成功连接后必须真实503，恢复后重新检查成功，记录所有帧。
- [x] H4：新增C43 edge后继，原41954／55／56端口及12来源保持。仅GraphQL TLS target41900→41981和该location的client cert增加；archive41903及account41952的所有原配置保持。原27其他容器／29进程不动。先切换、实测，再真实回滚到原edge并实测，最后重新切换；全部阶段原始日志／inspect／时间／identity保留。
- [x] H5：独立核验后继配置／来源／真实请求／故障／回滚，固定新listener／两个新container的明确authority；原C43旧edge只在独立证明已退役后精确清理，不删除卷镜像或原文件。最终原27＋两个新container=29运行／14既有health，新listener另计，不把新runtime元数据与历史28混用。
- [x] H6：当前C43真实Chrome只读资产／质押读取验证、完整worker／UI／H0／十域窗口与空journal／密文保持，0模拟／签名／执行；更新安装恢复说明、Task、workLog、totalProgress。普通ChromeCA、名称native-current／S+20、所有NFT矩阵和完整父合同仍待。

任何阶段失败均保留唯一operation；不盲重跑部署器。新edge失败时按明确原edge rollback恢复端口；候选监听器故障暂停必须finally精确SIGCONT。新组件自动Docker重启不代替Python监听器恢复：系统重启后先按原debug核心、原查询／发布器顺序恢复，再使用后继的boot恢复脚本和实际H0请求复核。此计划不触碰原BMWQ／FFMB／DEFM或原GYF执行profile，不重跑200000／283000／333000有限任务。


实际完成：[正式准备](./20261007-C43-http11-transport-prepared-01.json)／[独立准备](./20261007-C43-http11-transport-prepared-independent-01.json)、[切换及实际回滚](./20261007-C43-http11-transport-switched-01.json)／[独立切换](./20261007-C43-http11-transport-switched-independent-01.json)、[精确清理](./20261007-retired-C43-http10-edge-cleanup-01.json)／[独立清理](./20261007-retired-C43-http10-edge-cleanup-independent-01.json)通过：16真实十域warm、约20.02s暂停新guard后的实际read-timeout503及恢复、三个否定门槛；三个阶段36十域查询／原12来源全部成功；78三入口实际预检／method／来源门禁及mTLS私有CA/SAN核验。真实旧edge回滚后再次切新edge；旧edge在独立审核后非force精确清理，原文件、卷／镜像／数据保留。

当前29钱包容器／14既有healthy，原29进程及另一个新HTTP11 listener；全局110＝98运行／12退出，累计42确认退役容器已清理。`wallet_http11_transport_ownership.py`固定显式后继，历史28／旧C43注册证据保留原版本范围，不再用旧容器ID要求当前edge。原三有限任务已终态不重跑。

[实际already-running恢复入口](./20261007-C43-http11-restore-already-running-01.json)证明运行中返回零信号／零metadata修改，五协议／boot谓词unit通过；尚未发生下次系统重启，不能把这些记为实际后续host boot恢复验收。新启动器仅将原dev Handler协议设为HTTP1.1，原source、8／32准入及所有检查不变。

[当前窗口](./20261007-C43-http11-current-read-window-01.json)实际HBase最低364744／SQL365130／Rocks365133，完整41watermark／Display、原consistent范围和十域实际GraphQL覆盖原质押后的当前快照。它不代表名称native-current／S+20或consistent历史点查332734。

[新入口九Chrome只读检查](./20261007-C43-http11-indexed-receipt-chrome-01.json)和[独立native／BCS／typed摘要](./20261007-C43-http11-indexed-receipt-independent-01.json)通过：原新M4空journal profile正常冷锁定／解锁，57原GraphQL响应零读取error；原GYF332734回执和真实Observer indexing=true、S365010／3nJaXGxGfppFKQcFKV5YpYrXGaMFEtoZsFS2QU2bxkqb完整十依赖／Display、真实刷新；原账户密文／三journal不变、正常重锁／Chrome自然关闭，零模拟／验签／执行。仅此读取范围，不代表全部TX08或普通Chrome安装／系统CA验收。

HTTP1.1允许持续连接且须准确Content-Length，本地原Handler所有响应均为0字节并明确标记：[Python官方](https://docs.python.org/3/library/http.server.html#http.server.BaseHTTPRequestHandler.protocol_version)。keepalive8约束每worker空闲缓存，不能当作总连接／业务并发上限；HTTP1.1与清空Connection配合：[nginx官方](https://nginx.org/en/docs/http/ngx_http_upstream_module.html#keepalive)。运行仍由原guard的8checks／32admitted限制。本项为本地dev正常运行后继，未宣称公网生产部署、所有503根因修复或持续可用。
