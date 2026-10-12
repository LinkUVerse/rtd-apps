# 发布门禁连接复用与索引提速（2026-10-04）

## 实施与边界

publication-guard 的 MinIO 客户端按进程、端点、CA 内容及访问身份复用连接池，最大缓存16，连接池8；每次读取当前CA，证书变化新建客户端，空或非法信任材料拒绝。显式TLS最低1.2、连接2秒／读取5秒、禁用自动重试。未缓存对象内容或发布结果，完整前缀、固定版本、SHA-256及复制状态核验不变。

依据 [MinIO Python API](https://docs.min.io/aistor/developers/sdk/python/api/) 的线程安全／不跨进程共享约束及 [urllib3连接池文档](https://github.com/urllib3/urllib3/blob/main/docs/user-guide.rst)。部署通过 link-u-smart-contract/all-in-one-deploy/localDeploy/upgrade_wallet_guard_transport.py，验证原镜像层及文件后仅替换 guard。新镜像 sha256:93cd61559b8a4980b8443392eb5f2ed04be1f992913b15cd967cb25fa197f0e6；未重建链或数据库，未变更 rtd 源码和 debug 产物。

适配器通过 rebind_wallet_checkpoint_transport.py 仅更新 visibility.py 源码绑定。macOS Python 从启动路径转为 Framework 可执行路径导致原启动器登记失败，随后按原命令参数、实际解释器、精确启动时间及意图文件重新核验已启动进程，再登记原进程，未重复启动。受控身份测试通过；原 manage_wallet_checkpoint_adapter.py 未修改。最终原启动器 status 返回 running=true、PID58074、port39591。certified=false 是该本地适配器既定返回值，认证依据是独立门禁验证，不能混为一谈。

## 实际证据

- 主机 guard 全部32测试通过；镜像中 visibility/checkpoints/transport 24测试通过。最初镜像全套失败因缺 openssl CLI，保留失败日志，8项TLS测试由主机全套覆盖，不称镜像全套通过。
- 同 checkpoint 前后各12次全部成功，中位0.698047854秒降至0.5146711665秒，约26.3%。见 20261004-guard-before.json 和 20261004-guard-after.json。后者亦记录只读角色、可信mTLS、同一已提交边界、固定版本SHA和越界／缺证书拒绝认证通过。
- 时间点消费速率约：indexer 2.4→3.73 checkpoint/s、consistent 1.3→1.89、KV约1.87；链写入约4.5–4.6。索引仍不能追上，不能将提速写成积压消除。见 20261004-guard-indexing-observation.json。
- 真实 WalletAssetReader 读取共同快照87061，0仓位、1验证者、13请求、0提交，见 20261004-guard-optimized-wallet-read.json。这不证明非空仓位已可见。
- 额外 adapter checkpoint50000 探测5次503：4个槽被现有消费者占满，记录于 20261004-guard-adapter-read.json；未算作读取成功，不绕过预算。
- 聚合执行计划扫描243281个已提交checkpoint，单次约56.6ms，10670 shared hit blocks。此轮仅 inspect，未执行VACUUM或DDL。见 20261004-guard-ledger-plan.json。

## 后续与状态

继续优化完整前缀查询的物理执行与整体消费预算，保留完整性、身份、TLS和取消限制；不能以缓存认证结论或取消前缀核验换取吞吐。已有交易仅按原摘要只读恢复，未新增签名／模拟／提交。40/98、40.8%、trial_ready=false 保持，ENV-05/06/07、TRY-05等剩余验收不勾选。
