# RPC-08动态字段接口完成核验

日期：2026-10-04。完成范围为动态字段／动态对象列表、名称点查与业务reader接入，不包含完整NFT转移或Chrome页面验收。

## 合同与证据

- asset-reader.dynamicFields经collectSnapshotPages读取完整分页，固定资产快照；解码器派生普通name和DynamicObject Wrapper<Name>包装字段ID，保留原始type+BCS。
- dynamicField按kind选择dynamicField／dynamicObjectField；校验返回kind／名称类型与BCS、fieldId及快照末验。只有明确null表示缺失，不将缺响应字段当不存在。
- DynamicObject.childId与包装fieldId区分，核对对象BCS前32字节UID；短BCS／错误UID拒绝。普通MoveValue不套用对象UID规则。staking、Kiosk／OriginByte在此基础上继续验证具体业务类型、owner与完整BCS。
- 当前定向4文件81测试通过，覆盖动态字段、资产reader、Kiosk reader及staking reader，包括多页、kind混淆、错名称／ID、缺失和截断BCS、快照失效。命令中另列的originbyte-reader.test.ts不存在，因此不计入文件数，也不声称该名称对应套件执行过。
- 使用原只读probe-live-dynamic-fields.ts对已部署Kiosk e6c4…ae63b实测，认证S43002返回5字段，含1个DynamicObject及4个DynamicField；逐个同名称BCS点查、返回kind／fieldId／value BCS／snapshot cacheKey一致。动态对象childId为已知NFT 8cc8…3109e。见20261004-live-dynamic-object.json／.log。此前普通系统字段实测仍保留于原日志，本次补齐真实DynamicObject缺项。

本轮没有改生产代码、签名或发送交易，未重跑构建。当前生产代码最近钱包tsc／dev构建／四入口审计证据为20261004-metadata-stale-*。

## 同步修正文档冲突

钱包08／archive07映射表的线协议RPC-17和RPC-18残留epoch.systemState／validatorSet当前状态建议，实际与两侧主方案冲突。重新在线读取[Sui固定Epoch源码](https://raw.githubusercontent.com/MystenLabs/sui/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-indexer-alt-graphql/src/api/types/epoch.rs)，system_state_impl使用epoch起始checkpoint；本地rtd-indexer-alt-graphql同实现。已改为固定S当前0x5 wrapper及内层动态字段BCS，验证者／pool／补贴起始epoch由当前状态提取，历史汇率另读同S动态表。保留原历史原文目录。

RPC-08完成勾选。真实多页大型fixture、Chrome以及RPC-22／23的NFT执行仍分别跟踪，不因本接口通过而扩大验收范围。
