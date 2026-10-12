# 适配器与消费者容量升级及恢复窗口

2026-10-04。使用指定link-u-smart-contract/all-in-one-deploy/localDeploy脚本，RTD源码／debug产物经build_binding重新核验；保留链、数据库和全部执行journal。本轮钱包业务代码／构建产物未变。

## 容量与受控停启

upgrade_wallet_checkpoint_capacity.py先检查现存2／1／1预算、三个消费者及adapter完整进程身份、完整adapter manifest、query／KV当前debug来源、KV不可变文件、此前48次容量证据及当前guard准入；默认只生成计划。应用阶段获得四把生命周期锁，将待修改文件和旧process／launch-intent保存在私有checkpoint-capacity-upgrade-01，SIGTERM并等待四个原进程退出，拒绝PID复用／超时，不强杀，不清库。

adapter启动器增加严格requestPermits配置，仅支持4或6，省略维持4；当前实例明确设6。indexer／consistent／writer各设2，总数6，guard仍为8。同步adapter配置摘要、两套消费者binding及KV manifest。原四进程30615／65784／65614／58074退出后，原adapter、KV、query启动器分别恢复；当前adapter15495，indexer20209、consistent20218、writer19863。现有ledger／GraphQL进程复用。

adapter启动时macOS Python再次从venv launcher转为Framework解释器；使用既有same_settled_process核验相同启动时间、全部原参数和由原venv探测的解释器路径，再备份并修正进程记录。没有把任意同PID进程登记为本次实例。

后续原adapter启动必须显式传--request-permits 6；旧四名额retune工具不会自动变成六名额工具，不应绕过它的总量拒绝。此次是有界受控升级，不是通用自动扩容。

## 检查结果

- 升级前后各6项测试通过：默认4、仅4／6、非法参数、改变基线／重复升级拒绝、身份变化不发信号、仅SIGTERM、超时与PID复用拒绝。测试固定保存的旧启动器fixture，升级后仍可复现。
- 原KV／query启动器返回exit0，完整原绑定和不可变文件检查实际执行。
- 后续guard12／12真实请求与准入通过，中位0.4439162705秒；不是严格同负载A/B或消费者持续吞吐保证。
- 三轮当前debug来源和adapter绑定核验均通过，实际stdout水位继续推进。第三轮indexer171202（22管线）、consistent107646（4管线）；KV只观察到重放中的transaction_dimensions管线100729，不把一个管线当作14管线整体恢复。

## 不能隐藏的读取中断

初次实际资产probe失败：SnapshotReadError(partial)。原GraphQL日志显示共同上界104095已不在consistent重启后的可读区间[104096, 当前上界]。真实响应为BAD_USER_INPUT／Request is outside consistent range，钱包正确拒绝整个集合，没有当空资产。

本地rtd-kvstore源码store/bitmap_committer说明：持久bucket_start_cp使init_watermark重启时从活动桶起点重放；不是人为清库或降低已发布水位。KV启动日志明确记录cohort start=97128、startup_cp_hi=104096、startup_bucket_start_cp=97128；重启后从97128重新处理transaction_dimensions，在覆盖104095之前其它已完成管线不会产生新高水位，GraphQL资产共同区间暂时为空。身份探针仍可通过，并不表示资产可读。

恢复等待期间保留初次失败和每次有界只读probe日志，当时不记为恢复通过；最终结果见下节。不能直接改水位、放宽快照或从Fullnode拼接资产绕过该条件。未来consumer停启需把bitmap重放及consistent重启下界作为维护窗口条件；仅检查进程running不足以验收。 已在使用的钱包环境应先设计分阶段停启：保留consistent原可读区间，等KV桶重放追过共同水位后再评估consistent重启，或明确维护窗口；本工具是一次性四进程升级，不能声称已实现这种滚动无中断能力。

## 证据

20261004-capacity-upgrade-{preflight,applied}.json（含原Python LibreSSL依赖警告及JSON输出）、capacity-adapter-start.log、capacity-upgrade-tests-final.log／after.log、capacity-guard-after.json、capacity-watermarks-first／second／third.json、capacity-owned-assets.log、capacity-assets-recovery-*.log。包含DSN的原启动详细日志仅存私有操作目录，不公开。失败的诊断请求也保留私有日志。

上述为恢复前的过程证据；最终结论以下节为准，仍不宣称追平PersonalKiosk203097或试用可用。


## 最终恢复验证（北京时间18:31–18:34）

第12次有界恢复探针在18:31:48通过，实际共同快照104195、同一部署账户13对象与分类校验成功，0提交；前11次失败日志及最初两次失败均保留。从消费者启动至首次成功约26分钟，属于真实维护中断，不能只以进程恢复时间计可用性。

18:32:15当前debug来源及两套adapter摘要均匹配；indexer22管线最低174807、consistent4管线最低111246、KV14管线最低104334，KV已越过重放边界并恢复全部管线推进。该次日志采样分别约4.52–4.81／4.76／4.64–5.28 checkpoint/s，不是稳定吞吐保证，也尚未覆盖PersonalKiosk203097。

实际Chrome在S104409下对象集合、非视觉行与链接、Kiosk卡片及空详情通过；正常私钥导入／密码、锁定／错误密码拒绝／解锁及整个浏览器重启保留通过，0模拟／0提交。使用当前原有产物及精确开发证书SPKI，不代表系统CA／原生host权限验收。直接NFT display、隐藏资产、非空Kiosk及转出未在此场景验证。

最终adapter PID15495身份匹配，requestPermits=6，三override均2，新adapter配置SHA5731bec08860b44d8346d9d2c674885449c507374d796ffe87f3058f655835e4。私有操作目录追加verification.json，公开20261004-capacity-completion.json记录四份实际证据SHA。此次停启与资产恢复验证完成，环境继续索引；整体46/98，trial_ready=false。
