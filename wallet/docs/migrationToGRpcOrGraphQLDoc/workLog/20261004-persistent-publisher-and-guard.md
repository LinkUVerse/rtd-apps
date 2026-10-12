# 2026-10-04 常驻认证发布者与私有发布门禁

## 常驻发布

指定部署入口 `run_wallet_certified_publisher.py` 新增 start／status，复用完整现有publisher-loop及admission／replica gate。原生管理层额外记录PID＋启动时间＋完整进程命令；检查PID文件一致，拒绝归属不明／PID复用／未完成启动；重复start只返回现有状态，不以过期心跳自动重启。常驻运行时once拒绝另启竞争任务。操作使用排他锁，私有日志按调用保存。

实际启动PID20639，首次status为working／healthy，replicaGateEnabled=true；再次start仍是同一PID。采样时补取cache达到66300个checkpoint，数据库仍active、publishedHi100、pendingHi为空，表示追赶尚未提交。任务超时预算7200秒，不能把working持续数分钟判作停止或重启；后续必须继续观察这个真实进程。具体采样见[重复启动日志](./20261004-persistent-publisher-reuse.log)。

## 私有发布门禁

新增部署入口 `prepare_wallet_publication_guard.py`，依次完成foundation／镜像源码核验、最小只读身份、mTLS和私有guard部署。固定镜像 `sha256:da37703f025afd918a6a878a11181211ac529c8d7229eafc24ad0eb2ca1bbda6` 内visibility.py／checkpoints.py／server.py／consumer_proxy.py／requirements.txt全部与当前源码SHA-256逐项相同；没有新建RTD二进制镜像或改用旧链产物。

私有guard loopback39590独立复验通过：

- PostgreSQL角色只读，无管理／写权限；mTLS认证成功。
- 同一已提交边界authorize204；创世及当前末尾checkpoint返回固定版本且SHA正确。
- 未发布未来高度、任意路径、非规范00序号拒绝；缺少客户端证书拒绝。
- `consumersSwitched=false`、`fullAPIReady=false`，未将GraphQL或浏览器桥接接到该门禁。

[门禁复验日志](./20261004-publication-guard-verify.log)、[结构化证据](../evidence/20261004-private-publication-guard.json)。这是私有认证检查点读取门禁，不是钱包三入口完整公开查询验收。

## 测试及下一步

6项原生publisher入口／进程归属测试通过；publication-guard现有26项测试通过。原RTDdebug链、持续stage writer及publisher均继续运行，无清库／强制重启。后续观察首轮追赶真实提交，再推进当前源码debug查询组件、可信ingress与浏览器桥接。ENV-04至08／TRY未完成，总体18/98。
