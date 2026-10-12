# 当前源码原生证书校验与增量续验

日期：2026-10-03。范围：独立钱包开发链的离线认证前缀；不代表发布准入、source／replica 一致性、公开 API 或 Chrome 验收。

## 构建来源

指定部署仓库入口 `link-u-smart-contract/all-in-one-deploy/localDeploy/build_wallet_archive_verifier.py` 将归档原生 helper 源码复制到独立构建目录，并将 RTD 类型／配置依赖显式绑定当前 `rtd` 源码。未使用原 helper 清单中的旧 `temp/rtd` 路径，也未修改节点业务源码。

`cargo build --offline -j 4` 完成 debug 构建，退出码 0，耗时 3 分钟；三个工具为 `rtd-archive-checkpoint-verifier`、`verify_checkpoint_range`、`render_checkpoint_payload`。只有一个未使用函数警告。当前 RTD HEAD 为 `49a05a0de323b45a49d067a855c419e98d071afc`，工作区差异 SHA-256 与节点构建绑定记录一致。完整 helper 源文件哈希、二进制哈希见 [构建来源](./20261003-archive-verifier-build-provenance.json)，编译输出见 [构建日志](./20261003-archive-verifier-debug-build.log)。

## 实链校验

信任根来自独立链自身 `config/genesis.blob`，数据来自节点保留的 `checkpoints/*.binpb.zst`。原生工具校验加权委员会证书、签名 contents、previous digest、原生交易／effects／events 摘要、变更对象摘要及累计交易数；按 epoch 结束证明切换后续委员会。

完整前缀 0–47221 验证成功，414174 笔交易，包含 epoch 0→1→2；完整 H0 为 `3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj`。全量耗时 118.926 秒，退出码 0。随后使用该成功输出状态及已记录 SHA-256 续验至 47321，累计 415052 笔交易，退出码 0。

全量状态 SHA-256：`3b1ec891e21b5562d6d550eb9ab9821075f663139386098f9e0187d2dffc7ebf`。
续验状态 SHA-256：`b7cd8ce37468db87435fab072a93b81e133fed7806ca12b168f1cc1d8ed9fcba`。

原始逐 checkpoint 日志与状态保留于 `/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261003-01/certified-prefix`；[证据摘要](./20261003-native-certified-prefix.json) 记录全量日志哈希、源码／二进制绑定与最终输出。

## 拒绝与续验探测

指定部署仓库新增 `probe_wallet_checkpoint_verifier.py`，运行前检查 debug 二进制、当前 HEAD 和 tracked diff 与构建记录相符，所有破坏性样本仅写临时目录，原链文件不变。8 项通过：有效创世、有效固定哈希续验、错误 seed 哈希、被改动 seed、未前进的续验高度、文件序号错置、截断压缩文件、缺失 checkpoint。拒绝用例均没有产出可信状态。见 [8 项证据](./20261003-native-certificate-probes.json)。

固定哈希仅绑定此前本地可信校验产物；任意调用者自带 seed／哈希不能获得认证。当前结果也不能替代已提交 PG 发布记录、source 与 replica 精确版本／marker、身份与网络入口门禁。

## 进度

总体保持 16/98，ENV-04–07 和 TRY 未勾选。下一步仍是独立链发布身份、源／副本与 PG 提交门禁的实际接入，再接浏览器入口和钱包核心链路。
