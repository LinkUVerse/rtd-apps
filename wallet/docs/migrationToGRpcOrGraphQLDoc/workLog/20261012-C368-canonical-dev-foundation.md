# C368：固定开发环境收敛与创世实际分配

## 当前结论

用户已确认验收本地钱包及链上功能。原 C362/G4 的可用性不等于固定 `rtd-archive-events-hbase3` 组合通过。本轮完整环境验收尚在实施。

## 已完成

1. 实查普通 Chrome 当前 G4 网络修订 5、100 RTD 首页及真实 endpoint；记录 Docker 全量只读快照（含无关容器用于清理后比对）。
2. 找到两层创世分配偏差：钱包初始化器增加随机水龙头账户；swarm builder 即使显式 accounts 只有指定地址，也给随机验证者额外分配 Gas 和创世质押凭证。首轮实际 gRPC 反例保留，新建的反例链已按精确 PID/命令发送 SIGINT 停止，没有进入归档。
3. `rtd-swarm-config` 增加可选 `validator_token_recipient`，显式选择代币接收人，保持验证者身份、质押目标和金额。两个真实 Rust 测试验证多验证者集中归属及省略配置的兼容行为，通过。
4. 以 `cargo build --locked --offline` 重新构建当前源码八个 debug 服务，通过且构建期间源码一致。初始化器禁止 release 回退、不增加创世水龙头，仅引用既有本地 keystore，未将私钥复制进运行目录。
5. 新链 `dev-canonical-20261012-02` 的 H0 为 `zsGbA3wJ85JZ5HFxySu2ayo7mdHzkHwAPnUmoVPKnis`。原生 gRPC 核验全部创世 Gas/质押凭证归指定地址、可用余额 35,200,000 RTD、协议 139；30 秒 checkpoint 3→12→20。主链 ready 可据此设置；查询服务 ready 仍为 false。
6. foundation v3 对固定组要求显式 `storageGeneration`；新一代命名卷不复用历史卷。7 项隔离测试通过；新旧容器和指定代际卷碰撞均拒绝。
7. 旧固定组恢复 Compose、完整私有 inspect、24 个容器身份已保存。受控停止并移除这 24 个旧容器，保留全部 16 个历史卷、网络及镜像。其他项目无删除。新组启动进行中，G3/G4 保留至替代验收成功。
8. 通用 query admission 入口吸收已验收的 HTTP/1.1 有限空闲连接复用；真实同一 socket 的允许→拒绝→允许测试证明每次重新检查授权。部署入口及相关测试合计 9 项通过。

## 尚未完成

固定组真实存储读写、认证发布、全部原生索引/查询子服务、合约绑定、普通 Chrome 各功能写入/恢复、目标环境独立重启和旧临时容器清理。不得用创世或单测通过代替这些项目。

## 原始证据位置

私有目录 `~/.local/state/rtd-wallet-migration/canonical-stack-20261012`：`evidence/eight-debug-build-recipient.json`、`evidence/genesis-recipient-tests.log`、`evidence/genesis-native-canonical.json`、`retired-legacy-foundation/`。原始 JSON、日志与配置不提交 Git。

## 固定 foundation 与合约部署进展

固定组采用新隔离存储，6 项基础中间件健康，HBase TLS 基础镜像已修复并完成真实网关/表与 PostgreSQL 验证。旧固定组原卷保留。认证 checkpoint 0–20（1017 笔交易）暂存证书、固定版本读回、拒绝越权写检查通过，首次发布至新主存储与副本成功。PersonalKiosk、OriginByte 五包、本地 NFT、名称与 Display 合约均成功部署到 canonical 新链；尚未完成索引绑定与 Chrome 验收。旧 G4 守卫镜像未通过当前源码比对，正在重建匹配镜像，未绕过检查。
