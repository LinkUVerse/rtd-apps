# C289 归档读取复用发布快照

归档 `verify_read` 先调用完整 `verify`，随后重新读取发布账本，结束再读取一次；单次请求合计四次新鲜账本快照。现拆出 `verified_publication_objects`，返回已经取得并完成对象校验的初始发布元组，由读取者在读取结束后再查一次并比较。没有缓存准入结果，也没有放宽源、副本、版本、SHA、H0 或前缀证书检查。

源文件为 `rtd-archive-service/modules/publication-guard/visibility.py`、`checkpoints.py`、`test_checkpoints.py`。新增初始快照之后发布标记变化、marker 分支末尾变化和内部对象读取时撤权反例；正例同时断言只进行两次账本查询。**55 项测试通过**。

[候选验证](./20261012-C289-snapshot-candidate-01.json)实际比较 0、492300、709569 三个 checkpoint，交换新旧请求顺序共 12 次，返回字节及 SHA 一致；非法路径、越界 checkpoint 继续拒绝。容器内对真实读取计数，新旧分别为 2／4 次新鲜账本快照。新旧实例承受的后台负载不同，单次延迟不能作为等负载提速结论。

[正式安装](./20261012-C289-snapshot-installed-01.json)已在保留 G3 的原 42990 端点完成，原 Guard 正常 SIGINT 退出后移除；配置、证书、只读挂载及资源限制保持。六个 C284 回放进程、G3／G4 两条链和 116 个其他容器身份保持，没有重启消费者或修改数据库。实际正反例、缺少客户端证书拒绝与八个模块 SHA 均通过。第一轮安装在任何变更前因旧 G3 runtime 缺少 `processIdentity` 字段停止；随后采用 C287 已固定的原出生身份核对，未从当前 PID 静默生成新的可信身份。

[部署后观察](./20261012-C289-post-install-ingestion-01.json)：30.320 秒内三条消费者约 7.82／7.88／7.88 checkpoint 每秒，新增暂态和 not-found 重试均为 0。与 C287 短窗口接近，尚未证明持续性能显著提高。[41 条实际持久水位](./20261012-C289-watermarks-after-install-01.json)最低 500371，固定范围覆盖 **500372/709570，70.5176%**。这不是完整数据比较或父项完成证明。

部署脚本位于 `link-u-smart-contract/all-in-one-deploy/localDeploy/qualify_wallet_C289_guard_snapshot_reuse.py` 和 `install_wallet_C289_guard_snapshot_reuse.py`；私有创建与回滚材料保存在运行目录 `publication-foundation/C289-snapshot-reuse-20261012-01`。G4 Guard 尚未安装本次快照优化，仍沿用已经通过 C282 的版本。复用优化不会被写成两套环境均已升级。
