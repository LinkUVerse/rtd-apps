# NET-11：跨会话／窗口读取预算

2026-10-05，实施前设计与G1–G5见[设计记录](./20261005-cross-context-read-budget-design.md)。父任务49/98，trial_ready=false；本批不勾选完整故障／试用验收。

## 行为与范围

先前每个WalletReadSession有独立4／64队列，多个UI、后台准备／恢复或准入会话可叠加。现在同一JS上下文全部session共用4个运行／申请名额及64个FIFO等待名额；同扩展storage bucket内的页面及worker，再以四个固定名字的原生exclusive Web Locks限制物理读取。所有网络binding共用，名字不含账户或服务配置。

同时申请四个物理名额，首次获锁的回调同步认领，取消其它等待申请，只执行一次叶操作。锁持有到实际promise／SDK正文、status和trailers结束，底层忽略取消时不提前释放；会话屏障继续拒绝迟到数据。等待沿用原会话／调用方截止信号，关闭会话只清除它的等待。满队列仍报WalletReadBudgetError。Web Locks缺失／完全拒绝申请时明确拒绝读取，新增固定公开错误，不输出浏览器原始错误。ExecuteTransaction没有加入读取队列或重试；其身份／验签／模拟辅助读取仍经已有叶包装，SDK复合reader外层不重复占名额。

依据[W3C Web Locks草案2025-09-24](https://www.w3.org/TR/2025/WD-web-locks-20250924/)的共享bucket、callback生命周期与取消语义，结合当前Chromium实测。四个是钱包本地资源策略，不是Sui服务限额。每上下文64等待并非跨窗口总等待64；跨上下文没有严格全局FIFO承诺，不同profile／隐身bucket／设备不共享。页面退出释放原生锁不能证明远端已经停止旧计算；ENV-05／06真实取消传播保持待验，不宣称服务器分布式fencing。

## 编码及有限验证

- 新read-concurrency模块、session共享队列、公开错误及测试环境专用exclusive锁模型；[9文件摘要](../evidence/20261005-cross-context-read-budget-source-inventory.json)。测试模型不进入生产，也不用于证明浏览器原生能力。
- [定向日志](./20261005-cross-context-read-budget-targeted-02.log)：7文件135项。新增8项覆盖多会话／独立队列竞争、四名额、等待／持锁取消、跨会话64上限、错误回收及缺API／拒绝；错误分类增加1项。旧忽略取消测试补充“已真实进入4操作”的等待屏障。
- [完整回归](./20261005-cross-context-read-budget-full-regression-02.log)：134文件1495项；[完整tsc](./20261005-cross-context-read-budget-typecheck-02.log)退出0。Happy DOM用测试专用锁模型，原实验localStorage／浏览器数据警告保留。
- [当前模块Chromium原生证明](./20261005-cross-context-read-budget-native-02.json)：6组、32次合成HTTP读取，四页面＋worker的15次读取峰值4；等待取消零fetch，忽略abort的已获锁读取等正文完成，关闭页面的4条旧HTTP均观察到取消、worker后继完成，操作错误无重试、缺API零操作。源码SHA匹配，TS编译输出固定。该最小扩展验证生产模块与原生API组合，不等同完整钱包／实链吞吐或取消传播验收。格式化前01证据仍保留，02对应当前源码。
- [新Local构建](./20261005-cross-context-read-budget-local-build-01.json)：稳定1001份源码SHA9aa2cd，UI61c89f／backgroundf2628c；审核profile03 revision2保持，双入口AST相等；[四入口39方法闭包](./20261005-cross-context-read-budget-wire-audit-01.json)通过。原dist完整备份，源码之后重新核验一致。
- [只读原journal](./20261005-cross-context-read-budget-original-journal-audit-03.json)：两套实际worker逐字匹配新background，原5＋2终态、7次Fullnode原生effects／digest／epoch／checkpoint一致，pending0，三store逻辑SHA与前批相同，0模拟0广播。01在dApp旧worker更新遇ERR_BLOCKED_BY_CLIENT，02在staking更新遇相同失败，分别0／5lookup且0模拟0广播；03重新打开更新后的保留实例通过。三个记录均保留，没有删除profile／清journal／重提交。
- [新bytes只签名](./20261005-cross-context-read-budget-fullnode-sign-only-01.log)：真实Fullnode3次模拟，正式模拟启用checks，返回BCS／预览digest／TransactionData Intent验签通过，0ExecuteTransaction。使用原公开测试账户及现有资金，无新faucet；不接纳资产快照，也不批准新执行。

[同一产物批准前8组授权矩阵](./20261005-cross-context-read-budget-authorization-matrix-01.log)已通过：origin tabs、锁定批准、账户切换、frame、网络切换、取消、模拟锁定及模拟取消；实际4模拟0Execute。此前Kit批次的8模拟是另一批时序记录，不能代替本次实际数量。两次当前worker验证、三次正式只签名模拟与本次授权root证明均核对到新UI／background字节。最终有限机器证据见[progress](../evidence/20261005-cross-context-read-budget-progress.json)。内币／NFT／stake完整批准、提交后切换、签名函数实际等待锁定、完整资产页面及正常CA仍属父TX／TRY／ENV未完成范围。

## 运行环境与进度

[06:15:43只读TLS观察](./20261005-cross-context-read-budget-history-01.json)：原有界历史回放PID66145仍运行，连续0–59577／59578 marker，原22管线水位未变，boundedExitCode=null，上界386503。未修改RTD／归档／合约部署与固定回放源码，未恢复live或重启原进程；不能记回放终态或共同资产窗口通过。

G1–G4完成有限范围；G5双方新增合同精确对齐、Task／实时进度、13章编号与14份完整原文保留检查已通过，回放终态仍待。NET-11的完整公开错误／服务故障和实际取消传播仍待，49/98，trial_ready=false。


## G5文档源码引用维护

最终宽范围文件链接检查另外发现6份既有方案中的错误项目根及已不存在历史文件引用。55个唯一链接修正到真实项目根，其中临时RTD仍指向实际存在的temp/rtd，没有替換为不同代次的当前rtd。30个唯一旧文件链接改为“历史引用；当前文件不存在”，保留原标签、接口清单和历史评估语义。重定位链接只定位文件，不沿用旧行号作当前源码证明；本批未重审这些历史代码结论。原文14副本与历史JSON清单完整保留。双方对应基线／迁移矩阵均同步标记，13章编号不变。

[发现清单](../evidence/20261005-cross-context-read-budget-prior-source-links.json)的candidate是初步探索，未直接套用；[实际映射与保留语义](../evidence/20261005-cross-context-read-budget-source-link-maintenance.json)记录最终每项目标。最终完整文档／源码／产物一致性见[核验](../evidence/20261005-cross-context-read-budget-document-verification.json)，不把文件可打开当作旧行号或历史运行结论已重新通过。


[本批最后只读TLS观察](./20261005-cross-context-read-budget-history-final.json)：06:25:41连续0–63732／63733 markers，原22水位不变、原PID运行、无终态；同一原supervisor继续，不重启或恢复live。[最终文档及产物一致性核验](../evidence/20261005-cross-context-read-budget-document-verification-final.json)保持有限范围，父任务49/98、trial_ready=false。
