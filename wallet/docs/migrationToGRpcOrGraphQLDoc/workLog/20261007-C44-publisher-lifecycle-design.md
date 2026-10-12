# C44 发布器后继生命周期 L1–L6

基于已完成的N1–N4／C1–C4和sealed配方02，实施运行后继；旧7463／79715完成434325期间不发信号。98父项不另计。所有原native certificate／完整namespace／版本哈希／两副本／SQL epoch／control／marker语句保持；不能把obsolete PID伪装为仍存活。

- [x] L1：将真实已验证且immutable的C44前继事实拆解为fresh source/eight debug、全部静态pins、25未变消费者／两core及端口、HTTP11 listener/binding、29实际容器的全Config/StartedAt和14health、退役清理与G0原publisher。当前原G3仍活时，拆解返回必须与原完整capture逐字段相等；独立证明后才用于后继，不能只删掉旧PID检查。
- [x] L2：后继schema必须封存前继plan/hash、真实自然published/idle窗口、fresh pending=null／434325以上正式界及TLS marker/replica、原父单PID冻结后的无子再检查、停止原父的来源与结果、原私有metadata保持或精确归档、新canonical venv command/PID/birth/source/部署env及状态目录。未知或不完整authority拒绝；旧UID/epoch/Genesis/8debug/所有其余进程不替换。
- [ ] L3：实际控制器先实现readonly eligibility、精确单parent信号、任何freeze竞态SIGCONT恢复、独立新运行目录与原环境、自然drain／失败恢复；working child不终止、不重跑旧finite。不能使用不明退出码宣称exit0；非直接子进程只有身份消失／stopped状态证据时明确exitCodeUnknown。
- [x] L4：有意义的schema／wrong pins／wrong command／active original／new PID reuse／children race／working or pending拒绝测试，加当前环境实际拆解等价与原source/epochs/private files保持。测试替身不算真实切换。
- [ ] L5：只有自然边界实际出现后，执行明确切换与回滚。需要阻止后继 immediately 启动新批次以测回滚时，仅可用已有正式coordinator的新发布准入维护门，不伪造state文件、不改水位／epoch；维护门必须事先记录真实原值、精确scope、正式所有者权限，绝不能在原批次未完成时关闭。原计划的natural no-child／pending=null门槛仍成立；任何新增维护行为须先补齐具体实测设计及原值恢复证据，不凭此文直接调用。
- [ ] L6：最终后继显式authority、原档案完整、实际新publisher完整审核／正式边界推进与coverage七门槛核验；再推进424677当前NFT discovery／资金／写后刷新。普通CA／完整名称native-current／全Chrome等父项保持开放直到各自真实验收。

L1–L4是实施与测试，L5–L6是真实环境。尚无L5所需证据时继续独立实现，不能因自然边界等待而重启原活任务。当前私有配方02确保原虚拟环境，prototype01复核不合格已经归档。


2026-10-07 本轮实施证据：

- L1：[真实完整前继等价01](./20261007-C44-publisher-unaffected-lineage-01.json)实际1228唯一校验点、25消费者、两core／端口、G0 publisher、HTTP11 listener／binding、29容器完整配置／StartedAt、14health及两已退役edge，逐字段等于原完整capture；原G3仍活。三真实wrong／missing pin拒绝。
- L2／L4：[策略与实际控制器测试02](./20261007-C44-publisher-handoff-tests-02.json)100校验：全部必需字段缺失、错误链／plan／水位／epoch／admission、prepared tail、working／children／pending、非有限年龄、TLS／冻结／界变化、旧PID残留、伪造exit0、进程组信号、新PID重复、venv／command／部署／源码及时间序拒绝；实际控制器的freeze竞态／TLS失败／界变化只恢复单parent，working／pending／错误PID不发信号。合成用例仅算实现测试，不能算真实切换。原真实window03原值也被拒绝。
- [真实环境前置02](./20261007-C44-publisher-handoff-live-preflight-02.json)实际OS四否定条件：原live PID错误birth、foreign实际controller PID、原command错误SHA、准备目录缺真实authority拒绝。既有read-only private mTLS／marker／固定版本源和replica读取验证通过。原7463／79715仍working，正式401214／pending434325／prepared30532，零信号／写入／profile／执行。
- [实现封存02](./20261007-C44-publisher-handoff-prepared-02.json)独立私有operation，封存原plan及五实际实现源／两个资格证据；尚未激活。旧prepared01漏封CLI调度源，[复核记录](./20261007-C44-publisher-handoff-prepared-01-review.json)明确无启动资格，未使用；live preflight01测试工具误把原immutable reader的ValueError当FileNotFoundError，失败保留，仅v2纠正异常期待，真实控制器／authority源码未因此修改。
- L3已有真实控制器源码及上述异常分支测试，但尚无原父实际冻结／停止／新启动或真实回滚恢复。启动不确定时保留实际PID／intent／日志并停止再次操作，不将它自动杀掉或虚称恢复。L3完整、L5／L6仍开放。L2完成是严格schema／显式ownership代码，并不表示存在已安装后继。
- 决定沿用进程自然边界进行实际回滚，不直接使用正式pause维护门：现有正式pause会轮换epoch和存储身份，与同身份继承合同不符；也不手工关闭control_admission或伪造维护状态。


回滚／最终恢复编码已经实现于wallet_C44_publisher_transition.py和manage_wallet_C44_publisher_transition.py：[16测试01](./20261007-C44-publisher-transition-tests-01.json)。它们先要求实际已安装前继，严格派生新drain计划，再复用同一个自然终态／pending=null／无子冻结控制器；不会复用候选旧目录或overwrite旧receipt。历史receipt与当前live identity分开，所有退休前继必须实际absent／stopped。真实回滚／最终恢复未执行。当前消费者选择与七门reader：[9测试01](./20261007-C44-current-publisher-ownership-tests-01.json)，实际preinstall等价及incomplete authority不回退到旧PID。L3完整失败恢复和真实操作仍保留未完成，不能把这16／9个测试算成L5。

当前original79715由原timeout机制结束，正式pending未提交；[实际超时诊断](./20261007-C44-natural-publisher-timeout-analysis-01.json)保留。后继02的watch只等待fresh naturally published／idle，不向工作原父或子进程发信号；所有原严格门槛保持。原源码run_owned确有stop_event先于Popen的保护，但本轮只审阅，不据此取消pending=null／终态门或变更实际部署。30分钟watch的运行意图位于私有operation02/watch-intent.json，实际结果另记，不假定它会安装。
