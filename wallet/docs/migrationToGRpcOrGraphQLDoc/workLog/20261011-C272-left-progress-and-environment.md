# C272 剩余工作量持续更新与环境收口

2026-10-11。用户要求把 C271 的 45 个子包整理到 leftProgress.md，继续把 27 个未收口子包推进到 0% 剩余。

## 已完成

- 创建统一生成的 [剩余工作量](../leftProgress.md)，逐包保存状态、剩余验收比例及证据。
- update-migration-progress.py 同时校验子包／父项汇总并生成 leftProgress.md、totalProgress.md。
- 原始基线和 C271 现场证据保留；文档落地本身不虚增 27 个业务子包的完成数。

## 授权与实施边界

必要时可重置本任务 dev 链及归档索引，使用 link-u-smart-contract 的部署脚本及 rtd 最新源码 debug 产物。先区分历史数据积压、环境配置和源码逻辑缺陷。确认逻辑缺陷必须修复原仓库源码；保留原钱包账户、待定交易 journal 和原环境必要证据。新小范围环境的通过不能冒充原固定大范围重放完成。

## 进行中

正在核查发布器全前缀复验、当前积压与干净 dev 环境启动路径，决定最短且不削弱验收的恢复方案。

## 实际推进

- 已核验 C147 的 8 个 debug 产物与启动时最新源码完全匹配，使用指定部署仓库初始化 dev-20261011-04（H0 `2mXWebAgGXBrLjqTzan3Mi26jeME8nt57NesvLqvVJKB`，端口 43150/43151）。
- 新链从创世设置 5000ms；两轮探测均未推进，第二轮原始记录为 20→20→20。属于干净链也能复现的运行停滞，未设置 ready。转入 [C273 源码修复](./20261011-C273-checkpoint-drain-liveness.md)。
- 初次 Docker 启动失败为地址池用尽；逐个确认 6 个 C58 旧测试网络无关联容器、对应项目也无保留容器后清理，数据卷、镜像和其他项目不动。证据：[网络清理](./20261011-C272-retired-networks-cleanup-01.json)。
- 新 foundation 初始 spec 沿用旧 HBase 基层镜像，导致 HTTP 请求发往 HTTPS S3。使用 link-u-smart-contract 的 upgrade_wallet_foundation_hbase_tls.py 核对当前源码两个 TLS 文件及相同镜像基层后修正，正常启动全部 6 个中间件。该阶段只说明 middleware 健康，尚未接入新链归档／索引。
