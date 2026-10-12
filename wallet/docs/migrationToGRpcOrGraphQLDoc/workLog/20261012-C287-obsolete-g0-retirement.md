# C287 清理被替代的 G0 环境

G4 是当前试用网络；G3 仍用于不同 H0 对照、原 pending 隔离及固定 0..709569 全量回放，必须保留。G0 `dev-20261003-01` 已被替代，其独占 Docker 网络没有其他环境接入，C280 原十条 journal 的链身份均为 G3／G4。清理前保存了精确进程出生身份、容器配置、8 个卷、源码与受保护服务清单。

[执行结果](./20261012-C287-g0-retired-01.json)：停止 G0 的 14 个本机进程，移除 13 个停用容器；所有 8 个卷、宿主机数据库、checkpoint、配置和运行材料保留。其余 117 个容器身份及 G3／G4、六个 C284 回放进程保持。未执行 Docker 全局 prune。

链使用 SIGINT，其他本机进程优先 SIGTERM；容器正常停止后才执行不带 `-v` 的删除。旧 Guard 不含 C282 修复，使用 SIGINT，退出码 130；HBase／ZooKeeper 的 143 是收到 SIGTERM，不是 SIGKILL。

旧 G0 发布器 PID 93404 在正常停止后等待超过十分钟仍未退出，且没有子进程。再次核对其原出生身份、G0 归属及全部受保护服务后，仅对此无用进程使用 SIGKILL。范围与时间在私有 `obsolete-publisher-stop-escalation.json` 保留，最终结果明确 `directSigkill=true`。这是淘汰旧环境，**不计 WAL 正常恢复验收**。前期三次十分钟条件尚未满足的调用由断言拒绝，未发出额外信号。

检查发现 `rtd-archive-service/localDeploy/publisher-loop-dev.py` 的 `hydrate_source` 在扫描历史缓存及读取未发布尾段时缺少停止检查。已补齐入口、每个 checkpoint 和版本化读取结束后的检查，停止时不新写缓存。新增三项停止回归；缓存版本保留、staging reconciliation、managed publisher、控制准入合计 **30 项通过**。测试输出中的超时参数错误属于预期拒绝用例；LibreSSL/urllib3 警告保留。当前 G3／G4 发布器没有为了这项维护修复重启，不能把源码测试当成两套线上进程已重载。

这次资源清理推进 REL-05.7，但网络生命周期临时入口尚未恢复，最终运行清单也需再核对，故不提前完成该子包。吞吐按后续实读水位统计，不从资源数量直接推导提速比例。

后续[资源清理](./20261012-C287-final-resource-cleanup-01.json)已移除无容器引用的G0独占Guard镜像和空Docker网络；7个共享镜像继续保留，未删除卷。清理后的30.393秒被动摄取观察为约7.53–7.73 checkpoint/秒，三类消费者分别新增2/1/1次暂态重试；此短窗口不能证明持续稳定吞吐，见[实际观测](./20261012-C287-post-retirement-ingestion-01.json)。
