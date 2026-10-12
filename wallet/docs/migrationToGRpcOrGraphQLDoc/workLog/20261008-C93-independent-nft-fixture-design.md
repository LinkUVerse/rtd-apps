# C93 四类 NFT 授权与竞争验收的独立夹具

实施前合同，2026-10-08。对应 TX-01 全内部 NFT／有效期／赞助矩阵及 TX-04 M3、M5，不增加 98 父项分母，也不把夹具准备计为父验收。原六笔 C48 已成功转出，不能再次发送、重新存入或用旧快照作可转移库存。原七覆盖目标 524022、十三对象／五 cap／三账户／六摘要完整写后验收仍沿用 C92，不能被本夹具替代。

## 执行顺序

1. P93-1：封存 C92 六份当前文档；核对当前 C92 ownership、原 29 容器／14 健康／25 actors、两个 core、最新 RTD source／八 debug、1015 保护文件、原 C43 夹具与 C48 原始回执。原文件只读。
2. P93-2：使用当前 G3 原生 gRPC 获取已部署 nonempty_kiosk、personal_kiosk、OriginByte 和 migration_nft 的 ABI，恢复原 nonempty publication 的规范 TransactionData／effects，确认 TransferPolicy 类型及 Shared 所有权。只复用已部署合约；不重新编译／部署原合约，不运行旧 fund／publish／seed 目录。保存新准备 intent 与全部输入 SHA，零签名／Execute。
3. P93-3：新私有操作目录生成 source、existingTarget、newTarget、sponsor 四个独立密钥。全部先验证余额为零；仅给新 source 与新 sponsor 各一次原 G3 FaucetV2 请求。每次请求前 fsync intent；失败或不确定结果只读恢复，禁止自动补发。旧账户、旧签名 profile 与普通 Chrome 初始化保持。
4. P93-4：新 source 一次 seed：框架普通／listed／locked／exclusive 四件、personal 一件、direct 一件、OB 两件及独立 existingTarget Kiosk。共八 NFT／五能力对象／三个资产角色，另有 sponsor 资金角色。必须原生 ENABLED 最终模拟、同一规范 bytes／digest、私有签名本地验签、fsync dispatch pending 后唯一 Execute；不重建／重签／重发。模拟及实际 ObjectWrite 不得触及原夹具对象／cap／gas；原 TransferPolicy 仅不可变借用，并验证原完整对象 bytes／版本保持。
5. P93-5：独立读取新原始 gRPC 交易与全部新对象，核验 TransactionData、effects、owner／cap 关联、规范 BCS 和八件 serial 分支；证明旧八 NFT／五 cap 的完整原始字节未改。随后按正式资产快照门执行 M3 四类实际 live lock／durable pending 及内部授权矩阵；正面覆盖不足继续等待，不以 native 夹具成功冒充生产 Provider、Chrome 或父验收。

## 源码与权威边界

本地合约取自指定 LD 的 wallet-nonempty-kiosk-fixture、wallet-fixtures 与已经封存的原部署；框架 `seed_framework` 接收 `&TransferPolicy<FixtureNFT>`，只创建新 Kiosk／NFT／能力对象。实际模拟／执行的 output writes 和原 policy 完整后验决定“原对象未改”，不只凭函数名字推断。

[Sui 官方 Kiosk 文档](https://docs.sui.io/onchain-finance/kiosk/)及[官方 TransferPolicy 源码](https://github.com/MystenLabs/sui/blob/main/crates/sui-framework/packages/sui-framework/sources/kiosk/transfer_policy.move)是对标资料；RTD 本地品牌类型、ABI 与部署字节必须单独核对。框架 locked／exclusive 继续验证拒绝，不能把它们当可转移正面。

赞助仍按主方案：同一完整 TransactionData 的 sender 与 gas owner 分别验签；当前入口拒绝证据不能冒充双签执行。新 sponsor 仅准备独立资金，不宣称产品已经支持双签。有效期和重新授权保持最终 bytes／digest 不变；任何变化必须重新批准。完整父 TX-01／TX-04 继续开放。

所有准备、资金、seed、恢复、失败和独立审核保留原始私有文件与 workLog 证据。新操作不发原服务信号，不新建 Docker，不直接写 SQL／object storage、不修改链配置／CA／普通 Chrome。当前发布器和真实 native child 的存活观察不计正式 marker 或写后覆盖。
