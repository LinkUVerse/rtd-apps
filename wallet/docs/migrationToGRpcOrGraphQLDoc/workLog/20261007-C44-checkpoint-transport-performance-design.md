# C44 checkpoint 读取与追赶性能 P1–P5

本段仅拆分既有 TX-08／QA-A20 的实际前置工作，不增加 98 父项。当前 C44、29 容器／14 health、原链与原发布器、八个最新 debug、1015 私有文件及所有前继 authority 保留。原执行 profile、成功交易、finite 创建器不使用。

- [x] P1：实际当前运行与 30 秒以上 native／writer／consistent 水位速率采样。证据 `20261007-C44-current-catchup-performance-01.json`：40.10 秒，native 4.264／writer 3.441／consistent 3.416 cp/s；仅短时样本，不承诺吞吐或完成时间。
- [x] P2：原 live guard 不变，独立 exec 解释器四次完整 `read_checkpoint` 分析、八次同 blob 真实 adapter／guard 读取，所有错误保留。证据 `20261007-C44-checkpoint-read-profile-03.json`。01 未记录 HTTPError 原状态、02 final inventory 竞争失败均独立保存；03 至多重做三次完整原 authority capture，不省略任何必需检查。
- [x] P3：两个只读临时 baseline／HTTP1.1 keepalive candidate 同镜像、证书、数据库、双副本及精确完整读取。ABBA 四轮，每轮八连接各四次 GET；实际连接数、响应 SHA／长度、故障关闭与 mTLS／SAN拒绝留证。只改变传输，CHECKS16／真实 catalog／published version／latest HEAD／固定 VersionId GET／双副本 SHA 校验全部继承原代码，不缓存事实。新 listener 有界 32 workers、5 秒 TLS／12 秒 idle、每连接至多 64 次；GET body／Transfer-Encoding 明确关闭，不自动重放。
- [x] P4：独立核验原帧、同 blob、连接计数／source manifest／拒绝和精确临时回收。若未有实际收益不安装。隔离测试不能代替真实消费者速率改善。
- [ ] P5：只在 P3／P4 成立且收益明确后准备显式 guard／adapter 传输后继及真实切换／回滚；完整 fresh 校验／容量与 trust binding 不变。随后再验真实 durable 水位速率和 424677 七门槛。旧 authority 不覆盖，未实施不勾选。

当前完整读取 profiler 观察到每次 30 次实际 SQL execute、4 次 fresh catalog；这些都是安全校验，不因成本而删除。此前只增 CHECKS32 或只改 threaded TLS 的隔离实验未达到安装收益门槛，故不重复当作已安装。当前初步检测 adapter 空 503 与 direct guard 成功并存，只是资源／传输嫌疑，不能据此写成唯一根因或已修复。


实际 [benchmark02](./20261007-C44-checkpoint-keepalive-benchmark-02.json) 完成128同blob成功响应／七否定门槛；[独立03](./20261007-C44-checkpoint-keepalive-independent-03.json)重新解析全部原响应、完整 source／Env唯一键值／readonly bind、实际24连接（benchmark16、其他8）、完整71 candidate／65 baseline日志。baseline16.018／candidate17.613 req/s、ratio1.09956，未达到1.20门槛，P5不实施；不能将keepalive收益猜作可持续根因修复。新候选只做隔离，不修改/安装到当前guard、adapter或消费者。

原首轮候选缺少/app搜索路径、零round；对应两临时预览已经回收。baseline普通Docker stop被PID1忽略后退出137如实保留，未宣称优雅；successor只向自身两个preview发SIGINT，exit130后无force rm。两轮4容器精确回收、无卷／镜像／数据删除，累计47。独立01的Env数组次序错误、02误把8个额外socket数成9及相邻线程JSON事件解析限制均保留source／失败，不拿失败当PASS；03校验每个唯一Env值、精确bind集合和完整raw_decode事件流。

[最终环境02](./20261007-C44-performance-final-environment-02.json)29运行／14healthy、原29进程及新listener、当前1120 C44产物／1015私有文件与八debug held，全局观察110＝98运行／12退出。未知12与外部Testcontainers保持。最新[coverage03](./20261007-C44-nonempty-kiosk-readiness-03.json)正式401214／pending=null，HBase386440、SQL386442、Rocks386442、Display386445、资产386444／account386430；目标424677七门槛全未齐。原publisher7463及子79715（实际through434325）仍在工作；该数字不是正式发布，原诊断through401214也不授予覆盖。
