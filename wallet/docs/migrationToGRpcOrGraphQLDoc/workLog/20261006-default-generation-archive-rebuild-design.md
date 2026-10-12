# 新 generation 有界归档重建 R1–R5

父QA-A17的独立子阶段，不增加98项。只重建GraphQL SQL／consistent RocksDB的0–205有界prefix；历史KV Ledger仍使用已经由同链认证归档构建的独立41885服务。全HBase/account重建及全部Docker冷启动继续分开验收。

- [x] R1：原／新native、两publisher、原六消费者、新五查询/账户/API、keys/pending/configs及source/八debug保护；全新DB、Roles、Rocks路径、41940–41945端口与独立operation无已有数据。
- [x] R2：独立checkpoint adapter仅指向同H0认证published guard；实际输入从归档固定版本读取，无native raw／Fullnode输入。两新重建消费者各1请求，原4＋新2=6，不超发布guard预算；两个adapter各4 permit独立保留。
- [x] R3：当前debug indexer/consistent从空DB/Rocks消费0–205（last-checkpoint205）；保留日志/完整来源，全部SQL/Display与四consistent提交到205，未知退出不得自动清库。
- [x] R4：新的GraphQL仅SQL＋consistent＋历史KV Ledger，明确不配置fullnode-rpc-url；真实read查询恢复同H0和固定S205资产。缺少Fullnode的模拟/执行保持FeatureUnavailable，不把历史查询服务称为可执行钱包。
- [x] R5：独立比对原认证创世币对象/余额、完整Display coverage、原新两scope与源/运行进程保持，审核实际流量只读归档来源。完成后仅勾本批范围，父QA-A17/ENV/TRY继续开放。

## 实际验收

[独立审核02](./20261006-default-generation-archive-rebuild-audit-02.json)与[生产资产读取01](./20261006-default-generation-archive-rebuild-assets-01.json)通过：23 SQL/Display及四consistent到205，206个Display checkpoint，五对象/余额恢复，Fullnode请求0。新GraphQL无Fullnode配置，真实模拟查询返回FEATURE_UNAVAILABLE、native模拟0；共7归档oracle只读请求。历史KV Ledger明确复用41885，未宣称全HBase/account重建。有限indexer进程已自然结束，退出码不可获得；初次审核错误要求它仍运行的失败保留，未重启或清库。父QA-A17继续开放。
