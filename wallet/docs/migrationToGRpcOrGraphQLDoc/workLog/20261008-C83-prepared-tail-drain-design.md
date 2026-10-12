# C83：保留 prepared 尾部的正常缓存排空交接

C81 已被 C82 独立终验确认为尝试失败、未安装、0 信号、交接阶段全缺失，原失败收据保留。C66 prepared0 与自然终态合同保持原样；本合同另用新目录和源码，不能自动重试旧 operation。

当前原父无 child 不单独构成交接资格。新合同还要求：完整原进程 birth／command／PID文件、原源码与八debug、全部25原运行记录／29容器14健康／1015保护文件保持；原 active epoch1、admission true、published486334、pending553728及精确 staging version；完整15116 prepared 行连续且全部列逐行摘要封存，完整chain／fence／admission行摘要同时封存，作用域 advisory lock0。

依据当前 publisher-loop-dev.py 的 tick，父进程在 hydrate_source 期间仅查询数据库、HEAD／GET staging 并写本地缓存；发布写操作在 invoke 的独立子进程中。run 的 SIGTERM handler 设置 stopping 与 stop_event；hydrate_source 会正常完成，run_owned 在 event 已设置时于 Popen 之前抛 PublicationStopped，run 最终写 stopped 并移除原PID文件。C83要用原函数执行和真实独立测试进程信号验证这个序列，不能只依赖文本检索。

先执行 fresh before，然后只 SIGSTOP 精确原父，等待实际 T 状态，再验证无child、lock0、完整尾部与版本/行摘要完全相同和TLS marker/replica。若 race 失败，精确 SIGCONT 恢复父进程并记录失败，无安装／自动重试。通过后只 SIGTERM 与 SIGCONT 精确原父，最多7200秒等待缓存正常完成，禁止任何 child／进程组信号或强杀；每次观察需检测原身份与无child，异常保留实际状态。不依据静态计划判定原进程已退出。

原父实际消失、stopped／PID移除成立后，再执行独立新鲜只读SQL完整尾部／完整chain-fence-admission摘要、TLS marker/replica与全部lineage。排空期间不得修改admission、epoch、pending、checkpoint记录或对象；任何差异拒绝启动后继。只有上述全部成立，才启动已独立认可的C50 audit16／hydrate16、原venv／scope／epoch／完整native认证候选，保存实际新PID与authority，随后独立核验。原checkpoint-publisher-dev.py明确 resume既有pending bound与版本，对已有每行核验certificate／staging版本／published版本；不能跳过15116行或改pending到最新链头。

PostgreSQL 官方 [advisory locks](https://www.postgresql.org/docs/18/explicit-locking.html#ADVISORY-LOCKS)说明会话锁由会话生命周期持有，通过pg_locks检查；本合同必须实际查询，不以无child推定锁已释放。prepared尾部恢复语义以本地实际checkpoint-publisher-dev.py与发布账本为准，不把Sui内存snapshot恢复等同于RTD发布账本恢复。

实施：S1 独立原失败終验；S2 源码封存与全尾部只读计划；S3 政策／race／真实正常停止资格；S4 单次实际freeze→正常排空→fresh afterDrain→原候选启动；S5 独立新authority及发布推进；S6 原六NFT交易524022七覆盖／页面只读刷新，无重发。S4未实际完成前不勾D66-4，S6未完成前不勾D66-5或98父合同。
