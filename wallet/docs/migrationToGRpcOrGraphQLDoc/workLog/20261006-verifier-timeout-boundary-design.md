# 原监督器自行超时后的安装边界补充

当前78/98。此前严格只等published成功边界的600秒等待失败，0信号／0运行修改。实际publisher仍为原PID58791，SQL只读确认active、published726884、pending907824、epoch1；日志有多次waiting_timeout。当前校验加完整已发布历史审计的实际成本可能超过7200秒，需要改变下一次尝试的执行成本与有界预算，不能反复只等同一失败条件。

本补充允许两种实际边界：成功published／idle且through至少907824；或原监督器因自身既有7200秒预算退出owned子进程组后写入waiting_timeout。第二种必须明确标为原尝试超时，不能称为原批次完成。

- [x] B1 [11项有限边界测试](./20261006-verifier-idle-boundary-tests-01.log)通过，[原真实只读SQL](./20261006-publication-backlog-sql-01.json)保持；生产工具拒绝working／waiting_replica／stopped／failed／错误PID或时间／任意子进程／缺失或变动pending／错chain、epoch／非active。纯边界测试不代称实际安装边界已发生。
- [x] B2 准备独立工具，沿用原prepared02来源／八debug／原helper及备份；不修改已通过审核的旧工具。waiting_timeout只有reasonCode=PUBLICATION_TIMEOUT、publisherTimeoutSeconds=7200、实际最新状态原字节及PID一致、无owned子进程、age<3秒，并只读SQL确认published726884／pending907824／epoch1／active／H0与原私有绑定一致才可成为安装边界。独立[主CLI 20项真实前缀与故障输入对照](./20261006-main-debug-verifier-matrix-01.json)通过，两个主CLI输出同字节；等待期间0信号／未安装。
- [x] B3 实际原监督器自行超时、SQL pending907824／epoch1保持、无子进程的边界成立。只向idle原父PID58791发一次SIGTERM，确认退出再仅替换主debug校验器。安装器随后状态落盘失败，原失败保留；最终[独立恢复02](./20261006-verifier-venv-final-recovery-02.json)通过，恢复阶段0额外信号、无强杀。
- [x] B4 从原耐久launch-intent恢复原虚拟环境与原argv，只更改publisher-timeout-seconds 7200→14400；新publisher PID3664实际working。不能用ps显示的系统解释器代替原venv入口，首次由此启动失败及私有日志保留。预算仍有限，不降低quorum、原BCS、完整已发布历史审计、复制、fencing或commit验证。
- [x] B5 [最终实际恢复核验](./20261006-verifier-venv-final-recovery-02.json)确认新PID、原venv／argv／14400预算、当前来源、主校验器SHA4acc6d…、八debug／其他helper与六消费者保持；原scope／信任根及普通完整native validators恢复。下一真实批次终态、索引覆盖和Chrome验收仍独立开放。

旧I2只允许成功批次终态，保留原失败与旧合同；本补充依据当前真实反复超时诊断扩大可安全维护的idle边界，不把超时变成已认证高度，也不凭caller摘要跳过历史认证。主校验器候选仍为当前RTD源码debug，已有1024真实checkpoint两序两轮同字节／终态与30项正负校验通过。

2000秒等待[第一轮](./20261006-verifier-idle-install-01.log)未遇到合格边界，0信号、0替换。监督器working时间写于hydrate之前；既有7200秒预算从实际publisher子进程启动后计算，不能以working状态年龄推断已经超时。已重新完成[独立prepared03](./20261006-verifier-only-prepare-03.json)，第二轮有界等待3600秒继续观察实际子进程终态；未安装前B3–B5保持开放，不更改原pending和epoch。

第二轮[实际安装失败日志](./20261006-verifier-idle-install-02.log)：SIGTERM已发出但status.json使用排他创建导致FileExistsError，原prepared状态不能代表0信号。独立stop recovery01缺少局部路径变量、02完成artifact替换后遇到bytes写入文本helper失败；两日志保留。metadata completion01在部分安装时调用普通source validator拒绝旧metadata／新artifact，02完成全部原计划metadata字节与普通validator后因ps解释器缺少minio而启动失败。最终恢复使用原保存的venv launch intent，通过[最终02](./20261006-verifier-venv-final-recovery-02.json)。原status与所有失败材料保留，实际终态在final-recovery-status.json；整个维护合计一次正常退出信号、恢复0信号，原pending和epoch未手动改动。98父计数仍78。
