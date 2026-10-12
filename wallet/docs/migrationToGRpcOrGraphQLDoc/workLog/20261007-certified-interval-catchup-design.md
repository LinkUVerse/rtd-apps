# R2c：当前三 owned consumer 有限追平与恢复原在线命令

依赖[R2a／b实际证明及独立审核](./20261007-parallel-objects-progress.md)已完成。原25查询进程／两core／28容器／两publisher及最新八debug必须精确保护；只允许G3 writer／indexer／consistent 三个消费者有计划停止及重启，不影响原链。200000不是名称当前native新鲜度或父项完成声明。

- [x] C1：实际只读前置与私有独占计划。确认三消费者14 HBase／23 SQL／4 Rocks均已超过150000、都低于200000；基于实际postboot2 ownership记录精确保存三个命令／PID／出生信息、所有配置SHA及其他22进程／两core／两publisher／28容器状态。新的operation独占创建，不沿用preboot PID。正式数据、原metadata及计划失败记录保留。
- [x] C2：仅新建明确归属的41970／12名额有限replay。成员严格0–205和150000–200000，gap／tail拒绝；startup检查原完整认证／额外成员／资格03／native02／独立审核输入。真实marker覆盖200000，六边界／目标点字节匹配；并发预算不扩大正式CHECKS16或原consumer配置。通过后取得两stack／三个component独占锁。
- [x] C3：验证初始三PID未变后优雅停止，确认各PID退出，归档原process／launch-intent。只有finite命令remote URL换为41970并追加last-checkpoint200000，require-published-watermark与indexer require-exclusive-writer保持；原DB／HBase／Rocks目录、config、链、epoch、接口及密钥不变。每个新Popen保存准确出生identity和原始日志；不得无终态盲重试。
- [x] C4：实际追平观察与完整终态。每个有限请求仍重新SQL／双端latest／SHA和真实mTLS授权；前后原22进程／两core／两publisher／28容器／debug／原配置保持。writer及indexer须自然exit0；consistent四管线到200000，14持久HBase／23持久SQL／Display原谱系须到目标。周期记录实际水位和耗时；不手工改watermark，不把进程退出或预期速率当成功。
- [x] C5：恢复三个原在线命令。停止仅有限consistent，全部有限PID已结束后，以原参数／身份／原config启动三owned服务并保存新process记录；源URL恢复41891，不保留last-checkpoint。每个原参数逐字相同，source／八debug／两core／28容器／22保护进程保持；实际fresh授权、保留数据与cold window核查，全部证据独占写入。
- [x] C6：受控ownership后继。原postboot2 ready结果及before数据绝不改写。接受新的三个PID须有已完成恢复证明、原三命令完全一致、原出生信息已退休、对应原记录归档SHA／当前新记录SHA／明确operation结果／源与debug保持，其他22+两core不变。只有固定当前operation的完整后继证明可更新`wallet_postboot2_ownership.capture`认可范围；不能靠当前process.json或同binary／端口直接放过任意重启。
- [x] C7：失败恢复和独立后验。任何阶段失败保留实际原因、有限PID与原metadata，在明确ownership与独占锁下只停止本次有限角色并恢复原三个命令；数据不回滚／删除，不补写自然exit0或追平成功。恢复正常仅表示环境恢复。随后独立核验14 HBase／23 SQL／4 Rocks、Display和服务当前身份，再推进framework／原摘要写后读的真实UI与各父合同。名称仍按实际当前native及20 checkpoint门槛验收。

本阶段不更改RTD源码／协议checkpoint间隔／genesis，不安装CA，不重发任何摘要、不清journal或pending，不删除卷／镜像／原数据。仅用于有限catchup的进程结束后应及时按准确归属清理；独立数据库和失败证据保留。处理自身child回收和ps退出竞态，不强杀或对疑似复用PID再次发信号。

C1实际[私有计划01](./20261007-certified-interval-catchup-plan-01.json)记录writer14指标最低176317／SQL23最低181561／consistent4最低181562；仍为原三个41891命令。实际[持久HBase补充核对](./20261007-certified-interval-plan-hbase-audit-01.json)14管线最低176802，当前原三metadata／config／25命令／两core保持；[28容器／14healthy实际快照](./20261007-certified-interval-plan-containers-audit-01.json)保存准确ID／image／startedAt。三份观察时间不同，不将指标差异解释为原数据被修改；全部0信号／0launch。C2–C7未开始，尚无新的ownership认可或消费者切换。

当前C2／C3实际已实施，见[运行中观察01](./20261007-interval-live-in-progress-01.json)：41970／12有限source完整六点及marker验证、三个越界空404，原三个指定消费者各一次优雅停止，原6份metadata已经归档且SHA精确一致；仅内部remote URL和last-checkpoint变动，原三config SHA实查保持。实际finite PID writer97589／indexer97592／consistent97596，其他22查询／两core／两publisher／28容器逐次保护；尚未恢复原三在线命令或接受ownership后继。

实际连续观察SQL与Rocks推进到185172／185179；consistent初始metric0已恢复。HBase14最低仍178544，但bitmap sequential日志从173xxx继续逐批推进；不把最小水位暂未提高当作进程终止，不据此重启。需要自然exit0和全部目标持久审核，不手工抬水位。原控制器仍在运行，C4／C5／C6／C7尚未完成。后继policy新增11个明确否定检查及实际旧authority兼容核对，见[限定测试](./20261007-interval-successor-policy-tests-01.json)；这是合成PID policy验证，不是实际后继认可。

C4–C7当前实际完成见[恢复独立审核01](./20261007-interval-live-independent-audit-restored-01.json)与[唯一控制器终态](./20261007-certified-interval-live-catchup-01.json)。实际14 HBase／23 SQL／4 Rocks及Display均200000，两自然exit0；原三个41891命令逐字恢复，当前writer39302／indexer39311／consistent39319被固定后继证明接受，另外22查询／两core／两publisher／28容器14healthy保持，四个finite／replay进程实际已消失。独立后验重新读取HBase200000／SQL200188／Rocks200196；当前native200000–200180与全十字段共同点200000非空，真实Kiosk读取另验。原所有中间观察、旧状态段落和有限文件保持历史范围，不认为当时已经完成。81/98不变，名称native277923和四字段192496的真实拒绝仍表明名称新鲜度待追赶。
