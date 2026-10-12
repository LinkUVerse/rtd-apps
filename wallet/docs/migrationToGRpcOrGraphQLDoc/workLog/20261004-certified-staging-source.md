# 2026-10-04 当前源码 debug 检查点源

## 本批实现

部署入口均在 `link-u-smart-contract/all-in-one-deploy/localDeploy`：新增 `build_wallet_checkpoint_writer.py` 与 `prepare_wallet_checkpoint_source.py`。当前 RTD 源码 debug 编译 `rtd-checkpoint-blob-indexer`，20.19 秒成功；它与 HBase 写入器 `rtd-kvstore-alt` 职责不同。编译前后核对 HEAD／tracked diff，构建记录绑定产物 SHA-256。

归档 `dev_checkpoint_source.py` 新增 version 3 原生产物模式；v1／v2 镜像契约保留。`dev_native_checkpoint_source.py` 在初始化、读取配置、运行证书和写入前检查固定构建记录哈希、当前 RTD HEAD／diff、debug 二进制以及当前 helper Rust 源文件清单。写入只加载 staging 凭据，HTTPS 校验专用 CA，不继承额外 AWS token／代理；metrics 仅临时 loopback。运行日志使用独立私有文件，失败和超时不作为完成。

## 实际结果

- H0：`3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj`；generation：`dev-20261003-01`。
- foundation：`rtd-dev-wallet-pub-20261004`；staging：`wallet-certified-stage`；published：`wallet-certified-published`。
- 当前 debug helper 认证创世至 **100**，共 **867** 笔交易；真实 debug blob writer 写入后，原生水位与 H0 均一致。
- 对 101 个 checkpoint blob 固定 S3 versionId 回读，再次用原生证书验证通过。watermark／chain marker 也记录具体版本与哈希，共 103 个对象。
- staging 身份向 published 写入被 `AccessDenied` 拒绝。
- seed 成功后另行执行 `--stage verify`，复验成功；详见 [复验输出](./20261004-checkpoint-source-verify.log) 和 [对象版本证据](../evidence/20261004-certified-staging-source.json)。
- 7 项相关 Python 测试通过：旧版本源校验、证书失败不提交、输入突变／串作用域拒绝、新版源码／产物／构建记录漂移拒绝、证书 H0／范围拒绝、隔离 TLS 凭据环境与失败处理。

## 验收边界与下一步

这是有界 staging 数据，不是 published 数据。未配置 publication identity／认证发布者／副本提交／公开查询门禁，`publishedDataReady=false`。现有整栈 publication workspace 仍只接受 source v2；continuous source 仍为 Docker writer 契约，尚未适配 v3。后续需显式完成当前 debug 产物的 publisher／continuous 生命周期，不能隐式改用旧镜像或把 bounded seed 当持续同步。

运行 Python 环境仍发出 urllib3／LibreSSL 兼容警告；本次 TLS 验证请求实际成功，不据此认定长期发布者运行环境已验收。原链、GraphQL 与内部归档未重启或清库。ENV／TRY 不勾，总体仍 **18/98**，尚不可试用。
