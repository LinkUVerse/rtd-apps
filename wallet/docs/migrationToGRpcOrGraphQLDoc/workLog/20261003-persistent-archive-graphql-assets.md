# 同链持久归档与实际钱包GraphQL资产读取

2026-10-03。当前rtd源码debug构建rtd-kvstore-alt与rtd-kv-rpc通过（2m32s），日志20261003-archive-ledger-debug-build.log。二进制SHA与PID记录于独立runtime/archive-ledger/services.json，未使用旧RTD release镜像。

源码核查HBaseCompatGateway.tableName仅取路径末尾表名，logical instance不隔离物理表。因此指定link-u-smart-contract仓库新增start_wallet_archive_storage.py，复用归档仓库基础设施compose但使用全新project rtd-wallet-migration-archive-20261003-01、独立网络／卷／HBase／MinIO及新凭据，网关仅绑定127.0.0.1:39480。原归档链和其表保持不变。新HBase完成14张表验证。

初次新HBase失败：本地旧基础设施镜像entrypoint在admin-probe分支未export赋值后的S3变量，envsubst生成缺凭据配置。核对容器脚本后，独立hbase.env补显式export属性的环境项，保留数据卷，仅重建本次HBase组件；恢复后GatewayProbe成功。初次Ledger启动被网关验证阻断，没有启动写入进程。失败日志保留，不将compose up返回当健康证明。

start_wallet_archive_ledger.py绑定上述物理隔离project并先GatewayProbe，再从本地0.binpb.zst开始用debug写入器回补所有流水线；内部Ledger39485、metrics39486／39488、health39487，记录H0／generation／binary hashes／PID，拒绝重复writer。4项隔离测试通过（错链、旧project、重复部署、重复writer）。此为本地受控探测模式，还不是经过可信发布门禁的浏览器入口。

直接SDK gRPC-Web请求内部39485失败，确认它是native HTTP/2 gRPC端口；probe_wallet_archive_ledger.mjs使用真实protobuf封包、curl HTTP/2、grpc-status与帧长度校验，成功读GetServiceInfo完整H0以及checkpoint0同摘要。证据evidence/20261003-native-archive-ledger.json。不把内部native gRPC冒充浏览器桥接。

connect_wallet_graphql_archive.py核对原GraphQL PID完整命令、同H0 Ledger证据，优雅停止且等待该唯一进程退出，只将--ledger-grpc-url从39400切到39485，其他索引服务保持运行；旧进程及参数保留在metadata。GraphQL后续真实请求已返回正确创世digest、非空head digest及Address.objects覆盖区间，见evidence/20261003-graphql-archive-connection.json。

scripts/probe-live-graphql-assets.ts运行实际WalletAssetReader.open/ownedObjects/balances/kiosks，不构造伪快照。首次漏配已部署framework kiosk=0x2而被合同拒绝；补显式配置后成功。固定checkpoint36504，共同覆盖与末验通过，地址0xaaa读到1个OwnerToken和1个OriginByte Kiosk，内含1件实际P2P转入NFT。证据evidence/20261003-live-graphql-assets.json。测试未签名、未发送交易。

尚待：新链可信发布窗口／浏览器gRPC-Web桥接、accountHistory、TLS/host permission、实际钱包OriginByte准备与后台提交恢复、Chrome端到端。ENV-04–08、RPC-22、TRY仍不勾；当前16/98不可试用。业务源码本轮未改，不重复宣称全量测试；部署4项守卫与实际GraphQL路径为本轮新增证据。
