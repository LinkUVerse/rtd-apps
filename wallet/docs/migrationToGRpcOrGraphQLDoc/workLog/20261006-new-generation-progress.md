# 新 generation 的实际准入与停滞记录

本项推进QA-A17的真实新H0夹具；原dev-20261003-01的genesis、数据库、profile4、pending、密钥与源码debug产物保持。所有环境创建脚本位于link-u-smart-contract/all-in-one-deploy/localDeploy。

- [x] X1 [独立新链创建](./20261006-new-generation-launch-01.json)：dev-20261006-02，PID29014，RPC41740／faucet41743，当前RTD源码八debug，创建genesis和启动节点均记录min_checkpoint_interval_ms=5000。ready=false，未部署钱包查询服务或合约。
- [x] X2 [独立实际诊断](./20261006-new-generation-stall-audit-01.json)：新H0 DezkyXT5YdeqNPeet2fkTAVzZSZMCLB1vWbihtKRebnJ；真实生产Reader接受新H0并拒绝原H0。原链仍可通过native读取，原保留文件哈希保持。完整genesis锚定quorum前缀0–59共60个checkpoint通过。
- [ ] X3 推进／实际间隔及就绪：两次原探针[01](./20261006-new-generation-native-01.log)／[02](./20261006-new-generation-native-02.log)失败，未覆盖或重记通过。独立诊断16秒内head维持59，最后六个认证间隔小于请求的5000ms；当前共识commit1001停止，不能仅因进程／端口存在或env声明记为就绪。
- [ ] X4 新查询／归档栈、实际扩展同host换H0／同H0换generation、迟到请求、只归档重建和完整冷恢复。

- [x] Y1 另建默认间隔dev-20261006-03，RPC41750／faucet41753、PID55397；[创建](./20261006-default-generation-launch-01.json)与[完整native认证](./20261006-default-generation-native-01.json)通过，新H0 BkuLHhdtnoK7yLxo2eQuvcjHtdyipE7MMyxgTJiyHGg4，206checkpoint、实际head推进、六个有限间隔210–213ms。原链仍native可读且保留文件未变。
- [x] Y2 [独立native就绪](./20261006-default-generation-readiness-02.json)通过，fresh checkpoint849；当前源码／八debug／创建env／同PID端口／genesis与配置核对成立，queryServicesReady=false。首轮[配置哈希失败](./20261006-default-generation-readiness-01.log)保留；新审核逐byte反推client.yaml仅localnet URL由9000变为41750，精确还原到原launch哈希，符合当前rtd start源码update_wallet_config_rpc。没有跳过配置比对或修改原链文件。
- [x] Y3 [真实同URL native切换四案](./20261006-actual-generation-hop-01.json)通过：专用临时41760只转发真实GetServiceInfo的5个响应，原H0接受→同URL换实际新H0拒绝→恢复原H0重新接受；同H0显式generation替换时旧会话关闭，即使transport忽略abort，实际延迟HTTP响应仍被StaleWalletSessionError拒绝，新会话独立读取。原两链保持、0模拟／签名／Execute，临时端口已关闭。这里的generation是调用方显式选择，没有声称native服务返回generation或浏览器已验。

- [x] Y4 [实际保留数据重启 R1–R4](./20261006-default-generation-retained-restart-design.md)完成：原55397仅一次SIGINT，生产Reader真实不可用；沿用原argv／creation 200ms环境／genesis／配置和三处DB恢复36954，同H0／generation、固定206个认证checkpoint全部原字节保持，实际head6783→6823。旧主链fresh读取仍成立。首次收尾误查主链已裁剪205导致整体失败，原失败／源码保留；独立恢复审核0新信号／0新进程并最终更新native-only readiness，queryServicesReady=false。Y1／Y2中的55397是此前阶段PID，当前PID为36954。

Y1–Y4完成后，X3的5000ms失败并未改为通过。X4完整浏览器／归档／冷恢复仍待，QA-A17父项保持开放。

源码核查：GetEpoch使用get_for_version_if_supported，未读取ProtocolConfig的env分支，因此返回200这个版本默认值不能证明运行时覆盖。另一方面，debug模式启用seeded checkpoint transaction limit；队列超过交易上限可flush_forced并重置last_built_timestamp，间隔并非绝对下界。持久化watermark仅在已认证执行的builder summary和queue-drained commit落盘后推进；共识受1000个durable窗口限制。当前观测与这些路径存在关联，完整根因及修复尚未证明，不以提高窗口／伪造水位绕过安全门禁。

失败链与其日志、genesis和60个原文件保持；另建默认200ms、不同目录与端口的独立新generation，以继续准入和生命周期验证。它不得替代原链发布、原交易回执和名称索引验收。本日志不增加98个父任务完成数。
