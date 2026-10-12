# C375：固定环境完整验收与历史资源清理

状态：2026-10-13 已完成本地与链上验收和清理；未将外部服务或生产集群能力计入。

## 准确结论

钱包 C373 + 当前 RTD 源码八项 debug 产物启动的 dev 链 + archive 各子服务/配套工具 + 固定 `rtd-archive-events-hbase3` 容器组，已跑通此次约定的本地与链上功能。依赖为 13 个本机服务和固定组 13 个容器（6 个基础中间件、7 个归档服务/入口），不需要历史 G3/G4 链、数据库或临时代理。部署/合约入口在 `link-u-smart-contract/all-in-one-deploy/localDeploy`。

创世账户 Gas 与质押凭证唯一归属 `0xc535a846ad8aecf2c353c12b557612f0f1ae3bb09ba7cd2c6c8fa6fa56bf0df9`：35,200,000 RTD 可用 Gas、20,000,000 RTD 创世质押；协议系统储备保持系统所有。测试账户由该地址创世后供给。H0 为 `zsGbA3wJ85JZ5HFxySu2ayo7mdHzkHwAPnUmoVPKnis`。

## 已通过的实际范围

- 本地账户、首页余额、名称正反向与错误/过期拒绝、原生/非原生币转账。
- 质押与赎回，Display/无 Display NFT、本地详情及隐藏恢复。
- Personal/Framework/OriginByte Kiosk 转出，已有/新建接收 Kiosk、挂牌资产取出、锁定/独占拒绝。
- 非空历史、回执及交易时对象版本；14 笔 Chrome 链上执行、55 项历史对象独立核对。其中 2 笔是保留的交付失败反例，不能计作 dApp 成功。
- dApp 消息签名与独立验签、只签名不提交、错误参数/取消拒绝、正常执行及审批 UI 重载恢复后原结果交付。完整时序见 C371–C373 日志。
- 整套 13 本机服务和 13 容器停机/保留数据恢复，H0 不变、11 项真实读取通过；未模拟主机重启。
- 历史性能优化后完整 19 条页面约 3.4 秒；普通 Chrome 实际显示记录和回执，最终首页显示 998.88 RTD、123.45 WMIG。

## 精确清理

按清理前保存的容器 ID/创建时间/配置/镜像/挂载/端口逐项验证后，删除 33 个已停用的历史 RTD/wallet 容器、12 个确认无用途的临时镜像。其余 65 个容器保留且绑定不变，其中含当前固定组 13 个与无关项目 52 个；所有数据卷、旧链账户与 journal、恢复 Compose 和必要原始证据全部保留。没有执行 Docker prune、强删镜像或删除数据卷。

dApp 授权已从钱包中撤销，临时 5181 HTTP 工具按精确进程身份停止并确认不再监听。清理后再运行统一入口 verify，11/11 真实读取全部通过且 H0 一致。证据为私有 `C375-historical-cleanup/result.json`、`C375-post-cleanup-verify.log`；Chrome 证据独立于进程/查询证据。

## 使用与边界

常规启停使用 `rtd-archive-service/localDeploy/canonical-wallet-dev.py up|down|status|verify`；两个旧包装入口已转向同一 canonical runtime。当前 runtime 位于本机私有目录，源码仓库不包含密码、证书私钥、运行数据或截图。账户历史和交易归档存在发布追赶窗口，落后时明确可重试而不是伪造完整结果。

外部兑换、zkLogin、Qredo、Ledger 硬件和法币服务按用户确认不纳入本地链验收。这里不声称这些外部入口可用，也不将本机 Docker 证明扩大为生产多节点安全证明。
