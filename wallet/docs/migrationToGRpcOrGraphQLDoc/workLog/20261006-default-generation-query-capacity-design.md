# 新 generation 查询消费并发4→6 S1–S5

优先消除最新45455认证发布到实际资产索引的积压。已有原链六名额升级不复用为新链成功证据；本批只影响dev-20261006-03的新adapter/writer/indexer/consistent，原链、两native、两个publisher/keys/pending保持。

- [x] S1：新chain实际48只读、1/2额外并发与genesis/latest/future/SHA/mTLS/readonly门禁；当前源码八debug、最新caller身份/DB/Display配置、原文件保护。
- [x] S2：新adapter本身已支持4/6参数，不修改共享launcher源码。独立备份后仅配置4→6及两绑定/manifest；三consumer采用2+2+2=6，新archive有界重建两个1请求已完成205，其配置理论总8不超过guard CHECKS8。
- [x] S3：只停4个新owned服务（writer/indexer/consistent/adapter），保留原command/日志/intent；数据库/Rocks/HBase均保留。Display immutable indexer-config/source/gen不改，writer/consistent用新的2请求override，原budget/config不覆盖。
- [x] S4：按原精确command仅替换必要config路径恢复4新服务，old/publication/GraphQL/Ledger/API始终保留；真实范围/持久水位/资产与四角色恢复，cold runtime Gauge0不当成持久DB回退。
- [x] S5：只记录真实进展/源/错误留存/完整预算。不给倍增或全部新NFT覆盖承诺；父RPC/NFT/TRY/QA继续按实际S/Chrome证据验收。

## 实际实施

[安装02](./20261006-default-generation-query-capacity-02.json)通过：adapter80864/writer80922/indexer81063/consistent81214，4信号且原scope0信号。首次前置检查因macOS venv解释器切换拒绝，未创建operation/未发信号；02严格比对同PID/同启动时间/原intent/探测出的实际解释器/全部余参后仅采用已settled身份停止，原process记录原字节保留。共享budget helper和launcher源码未改。实际[窗口05](./20261006-default-generation-query-window-05.json)consistent10333–10509、Ledger9596暂不重合；[资产01失败](./20261006-default-generation-capacity-assets-01.log)被生产完整准入拒绝，没有发布部分余额或伪造snapshot。S4保持开放，另按真实持久DB/Display、四角色/资产/Chrome审核。


S4恢复实际完成：[资产02](./20261006-default-generation-capacity-assets-02.json)S10398/10原生对象/14只读请求、[四角色13](./20261006-default-generation-account-role-13.json)10333–10692建议覆盖/0–205原创世账户页、[当前Chrome04](./20261006-default-generation-C28-assets-chrome-04.json)10检查/真实四入口/完整journal保持通过。Account12共同窗口暂缺时拒绝的失败保留；随后未改门禁、未重启其他服务，13实际通过。S1–S5仅本六名额范围完成，未声明全部head/NFT/父任务或倍增收益。
