# 2026-10-04 当前源码认证 KV／Ledger 数据面

## 实现

指定合约部署仓库 `build_wallet_checkpoint_writer.py --component kv` 从当前RTD源码debug构建rtd-kvstore-alt／rtd-kv-rpc，2.54秒成功；独占保存HEAD／tracked diff与两个二进制SHA-256，启动再次核验。新增 `start_wallet_certified_kv.py`。

新的native-kv-stack使用可信发布foundation独立HBase；checkpoint来源固定本机39591适配器，require-published-watermark启用，原生消费者不持有S3凭据。HBase原生客户端连接新loopback39580 mTLS Envoy转发，再到同一独立Docker网络hbase-gateway，未更改旧诊断库／内部Ledger39485。新Ledger39585、metrics39586／writer39588、health39587均本机监听。

## 实际故障与修复

首次mTLS Envoy遗漏ALPN，两个原生进程均报HTTP/2 was not negotiated并退出。补h2，使用 `--repair-h2` 仅允许精确旧配置且两个登记进程均已退出，保存旧envoy／manifest／进程记录后修订；不改数据卷。后续启动增加真实curl mTLS HTTP/2检查，成功才启动消费者。

第二次KV运行后，Ledger因新库尚无genesis退出。新增14条同链水位至少0的前置检查；`--resume-exited-ledger`仅在原Ledger确认退出且genesis验证成功时保存旧记录并恢复，保留KV原进程。原失败日志、manifest、PID记录均在私有runtime保留。

## 实际结果

- KV writer PID84059，Ledger恢复后PID90546。
- 原生gRPC GetServiceInfo完整H0正确，GetCheckpoint(0)摘要正确；采样checkpointHeight16，14条管道均有水位，见[Ledger证据](../evidence/20261004-certified-ledger.json)、[管道水位](../evidence/20261004-certified-kv-watermarks.json)。证据是采样值，不表示追赶完成。
- mTLS HTTP/2握手验证通过；不提供客户端证书时curl失败(exit56)，没有开放无证书HBase入口。
- 2项定向守卫测试通过：mTLS／h2／固定上游配置，当前debug源码／产物／失败构建拒绝；见[测试日志](./20261004-certified-kv-tests.log)。完整实链证据不能由这2项测试替代，已分别记录。

## 未完成

KV仍等待更多认证published数据，未来checkpoint预取遇503属于门禁拒绝／重试，不能因此绕过guard改读raw目录。尚未接新的PostgreSQL索引器／consistent-store／GraphQL／query guard／浏览器gRPC-Web。native Ledger后端本身不能作为公开归档入口。总体18/98，ENV／TRY不勾。
