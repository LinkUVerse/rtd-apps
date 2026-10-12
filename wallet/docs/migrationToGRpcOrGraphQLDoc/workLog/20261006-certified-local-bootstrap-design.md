# 认证前缀有限回放 B1–B5

## 技术裁决与当前状态

原生 RTD Display 索引明确要求正式发布数据源。直接 `local_ingestion_path` 的独立205测试已失败并保留，不能删掉 `require_published_watermark` 绕过此合同。实施方案改为私有、有限的认证 HTTP 回放：完整前缀先由当前源码 debug 程序从 genesis 验证 quorum／连续性；每次实际读取仍核对新鲜 SQL、源及副本 latest VersionId／复制状态、canonical body SHA，再请求原门禁 mTLS `/authorize`。正式 committed marker 每次直接读取原门禁原始响应，不用本地 advisory tip 代替，不缓存授权结论。副本 body 并未在每次回放请求重新下载，不宣称与在线算法逐步骤相同；有限阶段后必须恢复原在线受控 source。

官方 Sui [数据源集成文档](https://docs.sui.io/develop/accessing-data/custom-indexer/indexer-data-integration)允许本地输入用于可复现开发／测试，并说明 backfill 与 steady-state 分开进程、保持数据库及管线配置、按已提交水位恢复。这个上游能力不覆盖 RTD 自身的 Display／正式发布约束；参考[官方 ingestion 源码](https://github.com/MystenLabs/sui/blob/main/crates/sui-indexer-alt-framework/src/ingestion/ingestion_client.rs)及本地实际失败，最终采用上述受控 HTTP 回放。没有调用 Sui 公网。

- [x] B1：75098个checkpoint（0–75097）完整认证；原67668份 APFS clone、新7430份固定版本 HTTPS下载、SQL／SHA／size及两次完整 latest HEAD复核通过。完整 debug quorum 验证通过，384.20秒；未更改原服务或部署数据。[证明](./20261006-certified-local-bootstrap-input-01.json)。
- [x] B2：实际 require-published-watermark 保持，独立数据库的27张业务 SQL 表与原同快照205完全一致，23条SQL和4条Rocks管线达到205、原生indexer自然退出0；生产 WalletAssetReader实际五对象／余额／七归档调用通过。[回放03](./20261006-certified-replay-probe-03.json)、[资产05](./20261006-certified-replay-probe-assets-05.json)。
- [x] B3：仅新链三个 owned 索引消费者有限追平75097，原配置、数据库、原链全部保留；保护独占writer及完整顺序。重启后的独立回放实际两个有限消费者自然exit0，14 HBase／23 SQL／4 Rocks达到目标；见`20261006-postboot-finite-catchup-01.json`。重启前旧HBase消费者缺少终态记录仍不补写。
- [x] B4：恢复三个原始在线受控命令，审核14 HBase／23 SQL／4 Rocks水位、Display／genesis／source及新鲜权限。独立online审核01实际三个原命令/PID、14 HBase最小82364／23 SQL最小83724／4 Rocks最小82453达到目标，Display readerLo0/source/generation/genesis及新鲜正式发布授权通过；公开四角色与历史另由C36验证。有限回放本身不等于公开准入恢复。
- [ ] B5：共同窗口覆盖夹具后，继续 NFT／Personal／OriginByte／Name／Display／交易正面业务验收，分别审核98个父合同。

## 失败与操作决定

直接本地导入01因Display数据源要求失败；资产02实际503失败、native直连04因gRPC-Web不支持失败；两轮速度基准01／02未完成（原在线适配器503），均保留。实际交替可用性03：原在线两轮共24个marker均503，回放两轮24个完整marker+checkpoint205均成功，速率1.69／1.79 pair/s；ratio为null，**不声称速度提升倍数**。[真实可用性记录](./20261006-certified-replay-availability-03.json)。选择有限回放的依据是完整认证、真实数据等价以及当前请求可完成，非虚构比较收益。新链三消费者停止后让出原适配器12个名额，有限回放最大12，原guard16保持；原链信号0。若有限阶段失败，恢复工具只处理已记录owned PID并恢复原三个命令，不删除数据、不宣称追平通过。

首轮新C28 gas测试因等待连接popup超时失败，0模拟／签名／Execute，独立材料保留；与已完成的旧C25 gas合同不同，不覆盖其结果。当前98项79完成／19开放、trial_ready=false，普通Chrome HTTPS／hostpermission仍未验收。
