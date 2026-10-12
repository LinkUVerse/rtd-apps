# C52：自然窗口内的驻留交接控制器

本实施清单先于编码。依据[实际只读耗时](./20261007-C52-handoff-readonly-timing-01.json)：资格校验0.0047秒、完整未受影响环境校验5.9466秒、完整实时窗口8.3398秒。旧activate入口先做一次完整环境校验，再由原handoff的before快照重新完整校验；这两段实测耗时之和约14.29秒，而原before窗口要求终态年龄小于10秒。该测量说明存在错过短窗口的风险；尚无本轮实际激活失败，不把风险描述为已发生的失败。

新增独立驻留观察脚本，继续使用原PLAN、五个封存实现、原qualification与原handoff算法。只移除activate入口与before快照之间重复的完整环境校验和外部控制器启动；原before快照仍每次重新读取全部来源／八debug／私有文件／进程／容器／只读SQL／状态，冻结后仍重新完整读取并验证TLS marker及副本。没有窗口缓存或重复使用SQL、marker、HEAD、GET、版本、副本、身份、epoch及admission事实；pending=null、prepared=0、no-child、终态年龄小于10秒等原门不改。候选命令仍为原封存候选，C50另一候选不在本次安装范围。

Q52-1记录完整实际耗时。Q52-2实现独立单次控制器／驻留观察并测试working、pending、prepared、陈旧、admission、epoch、缺来源、冻结race、TLS、边界、锁及阶段冲突的拒绝和恢复，所有测试为隔离fixture、零实际信号。Q52-3在07观察器确实结束且无未审核激活阶段后，封存并启动唯一有界观察；只在原完整门成立时一次交接。Q52-4独立审核实际终态、authority和后继推进；没有真实交接不记已安装或父项完成。

原07尚在运行时仅编码和fixture测试，不并发观察／激活。任何既有before-freeze、authority或activation-failure都先检查真实结果；新的控制器不自动重试、不杀活动子进程、不清pending或修改准入。失败只保留原阶段和原恢复证据；没有实际authority不得推广为新运行权威。

后续实际观察：07已自然结束，原控制器因 `No fresh natural terminal window` 拒绝；其原activation-failure保留，signals=[]，无before／after-freeze／old-stop／new-launch／authority。原子97749自然退出，正式486334／pending=null；这不是强制退出或交接。[独立旧失败检查](./20261007-C52-prior-readonly-failure-independent-01.json)只批准启动另一个合格观察，不批准freeze或安装。修订驻留控制器新增此精确失败审核门和实际独立解释器启动测试，[49测试](./20261007-C52-resident-handoff-tests-02.json)、[源码结构审核](./20261007-C52-resident-handoff-independent-02.json)与[实际进程绑定](./20261007-C52-resident-handoff-running-01.json)通过。唯一PID26195观察3600秒，后续真实交接及发布覆盖仍未验收；首个import错误和两次运行审核工具误假设保留。
