# 可信发布基础环境落地

日期：2026-10-04。ENV-04／05／06 继续进行，总体仍 18/98。

## 独立范围

已有 wallet debug 链、GraphQL、内部 kvstore／Ledger 的 PID 82143、98671、69874、69875 均仍在运行。内部归档采用 admin-probe 存储，不能直接作为正式发布门禁入口，因此创建独立 foundation v3，而不是更改旧链或把探测环境改称公开服务。

部署入口放在指定仓库 `link-u-smart-contract/all-in-one-deploy/localDeploy/prepare_wallet_publication_foundation.py`，复用归档仓库已实现的 dev_workspace。入口先使用绑定的 rtd/target/debug/rtd CLI 核验完整 H0，并校验 runtime 路径／genesis hash；拒绝 release 替代、错链、外部或符号链接目录、已有不匹配的 scope。foundation-only 启动拒绝已组成发布／查询组件的工作区，避免顺带管理整套服务。返回的发布准入和公开可用性为 not-assessed，不能从基础健康推导。

独立 project：rtd-dev-wallet-pub-20261004。workspace：`~/.local/state/rtd-wallet-migration/dev-20261003-01/publication-foundation`。PostgreSQL 39532、HTTPS S3 39581、ZooKeeper 39583；HBase／gateway 不直接发布主机端口。原始 spec、PKI、配置、卷及后续修订均保留。凭据只在私有 runtime，未写入文档。

## 实际故障修复

初次初始化缺少 publication-fence Python 模块路径，已修正入口；使用归档现有 publisher venv 运行。随后 HBase 400：选入旧 probe 基础镜像不识别 S3 HTTPS 设置，实际明文请求 TLS MinIO。没有关闭 TLS绕过。

新增 `upgrade_wallet_foundation_hbase_tls.py`：候选必须是不可变镜像，继承相同基础 layers；其 entrypoint／core-site 模板必须与部署源码逐字一致。通过归档 dev_image_upgrade 修订机制，把新 foundation 的相关 HBase 服务从 4e98d6ff… 改到 53621b088…；只停止／重建本新 project 容器，未删除卷，原始 spec／compose 不改。修订 ID：5e3b910d-d618-489c-bace-f5323efa7c98。原链和原内部归档没有重启。

## 验证与边界

- [部署防误用测试](./20261004-publication-foundation-tests-final.log)：6 项通过。
- [镜像修订与启动](./20261004-publication-foundation-tls-upgrade.log)：退出 0；包含 PG ready、HBase 表检查和 GatewayProbe。
- [独立复验](./20261004-publication-foundation-verify.log)：退出 0。该次输出仍用初版 false 字段，之后返回字段修正为 not-assessed，避免将基础检查误写为发布状态探测。
- [实际六服务状态与固定镜像](../evidence/20261004-publication-foundation.json)：全部 healthy；curl 使用私有 CA 验证 HTTPS S3 readiness 返回 200，没有忽略证书校验。
- Python 环境提示 LibreSSL／urllib3 警告，尚未作为未来网络发布者运行时的兼容证明。

证书源、阶段写入、发布身份／lease、发布者、副本、query guard 和公开 gRPC-Web 尚未接入新 foundation。尤其 source 模块现有 Docker helper 默认不能代替本任务当前源码 debug verifier，下一步需要建立明确的当前源码 helper 接入和证据，不能沿用旧 rtd 镜像假装完成。当前运行的内部 GraphQL／Ledger 保持原连接，仍不提供新的可试用 profile。
