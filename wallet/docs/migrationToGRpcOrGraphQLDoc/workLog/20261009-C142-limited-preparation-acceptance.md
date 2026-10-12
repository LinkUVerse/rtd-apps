# C142限定准备与封闭准入验收

## C142非NFT完整输入读取源的限定准备与封闭准入

协调器只共享同时在途且已经等待的真实授权观察，单组最多4个、收集最多10ms，授权开始即封组；后来请求和已完成结果不能复用。每个请求仍单独做新鲜SQL、源/replica最新版本与复制状态、正文SHA及授权后复查，后续检查最多2秒；没有完成授权缓存，不扩大现有4名额。已有MinIO/PG池保持，不把重复构造客户端或索引强制提示当作提速结论。

实际12项线程/Future测试和6项证书字段拒绝测试通过。新增确定性竞争实际暴露：close观察Future未完成后，请求超时先取消，使set_exception抛InvalidStateError；旧失败/完整源/日志保持，修复只包住已经完成/取消Future的拒绝竞争，完整逆变换成立，同一竞争测试修复后通过。独立31反例拒绝成立。PID检查是隔离桩验证，未称真实跨进程业务通过。

新证书门只接受全部0–709569共709570行、连续quorum/完整双端正文资格和指定独立审核。旧0–205及150000–200000有限membership不能用于完整回放。已编写独立全输入审核器和候选读取源，但完整输入审核及正向服务路径尚未运行。当前候选02实际因缺完整证书拒绝，在任何工作目录/客户端/worker/监听之前退出；候选目录保持不存在，42892端口前后plain bind空闲，原全运行、C120/C139和前台认证出生身份保持。没有部署或切换。

以上只收口P142-1及准备/负向子项P142-2a；P141全输入/quorum与P142真实权限/完整HTTP差分/收益、正常切换仍开放。完整查询/两账户/S3版本保真恢复/归档/WAL/冷恢复、普通Chrome/权限/TLS、名称和全部非NFT M5仍须完成。非NFT一期全验后才推进NFT业务；89/98、细分剩余9.18%、trial_ready=false保持。

证据为钱包workLog/20261009-C142-combined-local-tests-02.json、20261009-C142-incomplete-certificate-startup-rejection-02.json、20261009-C142-limited-qualification-independent-01.json及20261009-C142-close-timeout-race-failure-01.json。完整阶段进度独立记录，运行数量不算验收。

完整证据：[18测试](./20261009-C142-combined-local-tests-02.json)、[实际缺证拒绝02](./20261009-C142-incomplete-certificate-startup-rejection-02.json)、[独立31反例](./20261009-C142-limited-qualification-independent-01.json)、[真实关闭超时失败](./20261009-C142-close-timeout-race-failure-01.json)、[阶段观察](./20261009-C141-full-input-phase-observation-02.json)。
