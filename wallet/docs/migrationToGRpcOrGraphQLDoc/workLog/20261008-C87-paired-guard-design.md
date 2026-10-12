# C87：源站与副本独立读取并行候选

实施之前保持原服务和原请求并发16。准备源来自实际安装的不可变 guard image，仅修改 visibility.py 与 checkpoints.py；server、prefix catalog、权限和 PostgreSQL transport 字节保持。每阶段最多两条独立 MinIO 读取，每请求同步等待并消费两个结果，最大32个 IO worker。SQL仍由请求线程执行；不缓存 marker、ledger、对象事实或回复，不改 RTD 源码／debug，不跳过每次fresh marker、版本、角色、摘要或结束前复查。

MinIO [官方 Python API](https://docs.min.io/aistor/developers/sdk/python/api/)允许线程间使用客户端，禁止跨进程共享，固定 version_id 的响应必须close和release_conn。现有客户端仍绑定PID及完整信任字节。[Python官方executor说明](https://docs.python.org/3/library/concurrent.futures.html)要求避免future间等待死锁；两个回调只读独立 store，不互相等待，不访问数据库。executor逐次创建并在退出时join，失败也先消费双方结果；失败路径可能多执行一次独立只读请求，不允许响应准入。

- P87-1：从原实际安装字节封存候选，核验仅两处业务读取调度和一个helper变化；源码准备不等于安装。
- P87-2：原16 visibility／checkpoint合同在明确模拟ledger fixture下全部运行；追加双方并发、失败join、BaseException、无结果缓存、线程退出及race拒绝检查。fixture不认证实际prefix catalog／TLS。
- P87-3：独立审核源码与资格后，构建隔离image。复制原完整服务env、只读secret mount、网络、TLS、用户、权限与资源条件，只开两个独立本机preview端口。
- P87-4：实际完整checkpoint三组ABBA，固定4并发，两条既存已归档checkpoint全部回复字节逐个对齐。两服务业务Handler及HTTP协议相同，仅候选内部读取并行。保留fresh SQL/catalog/privilege/TLS全部路径，拒绝未知／格式错／越界及错误SAN／CA／缺少客户端证书；16并发能力另测。原1.20中位门槛保持，未达标不得部署。
- P87-5：所有实际原帧、原image业务源码、运行配置和精确cleanup独立审核。候选通过只代表有限性能／能力资格；连续原三cohort ingestion改善需另验，原父任务和C85正向不据其增加。

只清理本实验自有两个已保存identity的preview，正常SIGINT后确认退出再精确rm，无force、卷、SQL、对象、镜像删除。原29容器／14健康、25actors、发布父／child、1120钱包源码及1015保护文件必须保持。任何故障保留原回复和失败收据，不自动重试。后续受控安装必须独立计划和fresh检查；当前不改原服务。


## 实际执行与后续决策

P87-1／2完成：64项原合同及helper检查，独立AST与读取调用集／SQL／结束复查保持。fixture用明确旧aggregate oracle，不把它当实际prefix验证。八原guard委托stage读取、四原cProfile及八原HTTP全部成功；01／02工具身份结构和导入失败保留，03及独立01实际通过。

实际readiness04和完整prepared观察03显示全部41管线、Display、native资产及账户窗口已经追到正式486334；原pending553728尚未提交。原child17722自然推进prepared36132行至522466，lock1。当前等待原因是正式发布边界；不能把读未提交范围产生的重试耗时当持续消费吞吐。原source/eight debug／29容器14健康保持。

原8HTTP样本约0.05–0.14秒；热算法stage约0.02–0.06秒，初次建连接冷样本单列。理想双端并行比值只是各角色耗时估算，无候选队列／executor成本，不是1.20资格。早已运行的同一基础image双端并行384实验2／8档为0.943／1.016，未达预定1.20。当前不启动P87-3／4／5，不作为98父合同必需前置，不创建或安装候选；先让原发布批次自然完成，再验七门和完整C85。只有出现真实有可消费范围时的IO瓶颈新证据，才恢复这项条件优化并完整实测，门槛不降低。
