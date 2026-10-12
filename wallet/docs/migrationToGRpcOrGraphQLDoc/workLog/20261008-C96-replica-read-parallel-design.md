# C96：正式发布副本全量读取并发方案

本合同在编码前创建。当前正式 publishedHi=486334、pendingHi=553728、prepared=67394。C92父92149及child96377仍正常运行，不因耗时而停止或重启。486335项提交前缀诊断已于07:51结束，仅为本次工作阶段证据，不能据此提升正式水位或勾父任务。

## 保留的完整合同

C92的原生certified prefix、namespace完整检查、committed-prefix完整比对、待发布对象／SQL逐条事实、version／bytes、admission、object fencing、epoch及原子SQL提交保持原字节。只抽取并调度 require_replica_complete 中的两个只读循环：第一轮逐项调用原 wait_replica_complete；全部完成后第二轮逐项执行原 source／replica latest VersionId 再核对。每一checkpoint和三个元数据对象均不可遗漏，任何检查失败不得到达SQL提交。COMMITTED_KEY发布及复制确认保持原实现。

并发线程限定1–16，按worker数分批提交、保留输入顺序、每个已开始future均等待并读取结果，失败先排空该批，禁止后续批及第二轮。对象单项超时、传输错误分类、三replica故障注入及fresh latest核对保持；不共享跨进程MinIO客户端，不把旧诊断、SQL row或先前成功当作新证书。官方 MinIO 7.2.20 api.py 明确同进程threading客户端可共享；本机实际版本须核对。Python executor context退出等待所有已启动任务，测试须证明失败排空及并发上界。

## 编码与验证

1. 封存8份可编辑文档，绑定C95最终审核SHA；读取当前完整lineage、正式／pending／三版本／67394条ledger、真实PID出生和前缀诊断及staging head。未经认证的初次诊断脚本错误不得计通过。
2. 原源码固定SHA，AST提取两个循环，将per-item逻辑逆变换回原字节并独立核对。候选只替换此block为固定16读取helper、加载helper固定SHA，C50父只替换child绝对路径，复制原publisher_storage_errors依赖；父子实际原venv --help必须通过。
3. 单元／对抗测试覆盖1／4／16、所有对象和metadata、src／replica版本漂移、固定内容漂移、REPLICA／COMPLETED标志、真实HTTP传输错误语义、三故障位置、超时、重复／缺失输入、所有已启动future排空及两阶段边界。实际只读ABBA比较同一当前固定version样本，所有read原帧与结果、ledger前后保持，线程16中位≥1.20才有性能资格；采样不是全量证书、正式发布或索引验收。
4. 安装另需基于实际自然终态明确交接方案、精确C92 PID／出生／命令／fresh authority及完整lineage。无child、scope lock0、自然终态或实际timeout、完整断点／三版本不变；保持原缓存及正常精确父退出，不直接杀child，不提高7200超时，不绕过admission／复制／epoch。当前运行尚无安装授权窗口，代码资格不计安装。
5. 只有正式提升后执行原C92七覆盖与C88完整13对象／5cap／3账户／6摘要和当前生产Chrome；原六摘要不得重发，新夹具额外serial95资产不得遗漏。

总体仍84/98、14父开放、trial_ready=false；仅真实已完成子任务可勾。0新Docker、0原六重放，保护原29／14／25和1456文件，清理累计176保持。

官方依据：[MinIO 7.2.20](https://github.com/minio/minio-py/blob/7.2.20/minio/api.py#L113)，[Python executor](https://docs.python.org/3/library/concurrent.futures.html#concurrent.futures.Executor.shutdown)。
