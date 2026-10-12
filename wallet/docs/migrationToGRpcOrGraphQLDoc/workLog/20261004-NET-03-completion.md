# NET-03：客户端隔离与三入口身份核验完成

2026-10-04。此项只验收客户端创建、未验证隔离、身份握手和重复校验。能力／包／SDL属于NET-04；原生Chrome权限与TLS属于ENV-07；资产共同快照、完整功能和试用门槛另验。

## 实现合同核查

| 合同 | 当前实现 |
| --- | --- |
| 客户端来源 | shared/rpc中的客户端均显式读取已验证profile端点；Fullnode／archive为RtdGrpcClient，原生／账户历史为RtdGraphQLClient；MVR默认URL以空值覆盖。WalletRpcProvider注入领域方法，不向页面暴露原始SDK客户端。 |
| 三入口raw身份 | identity.ts对Fullnode／archive发Ledger/GetServiceInfo，校验完整H0、u64上界及可选下界；GraphQL显式读取checkpoint0.digest。探针客户端局部创建，只返回冻结证据，不返回可执行客户端。 |
| 错链与不可用 | known chain-mismatch优先于另一入口不可用，禁止降级接受错链。响应格式不兼容抛明确错误，网络不可用逐入口记录；部分入口verified只表示身份，不表示整体ready。 |
| 每次重验 | probeNetworkIdentity没有结果缓存；NetworkEnv临时会话在finally关闭。实际领域reader在每次操作／分页响应校验H0；Fullnode与归档明细在读取前后核验服务身份／覆盖，交易准备／执行各自有独立身份屏障。 |
| 取消与会话 | WalletReadSession、profile完整绑定、AbortSignal、共享读取预算和迟到拒绝贯穿。GraphQLSnapshot每次query保留walletGenesis，不能以缓存握手代替业务响应验证。 |
| 账户历史扩展 | 独立URL与独立chainId／snapshot／coverage合同；不伪装成原生GraphQL，也不把原生三入口探针当作其验收。 |

## 本轮实际三入口只读探针

scripts/probe-wallet-entry-identities.ts从保存的profile03 revision2创建完整profile／会话，对本机允许列表仅执行两轮三入口身份查询，强制omit credentials、redirect error，每轮必须新增3次真实读取。只允许两条GetServiceInfo与精确Genesis GraphQL查询，不含模拟、执行或签名。

两轮共6次读取均通过，三个入口完整H0均为3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj，dispatch=0。使用Node的显式开发CA信任；不是Chrome原生权限／系统信任验收。证据20261004-entry-identities-live.json和.log。

特别保留反例边界：本轮身份查询成功时，消费者扩容后的资产共同快照仍暂时不可读；身份通过不能解锁资产就绪状态，也不能标记trial_ready。

## 验证

6文件80项通过：identity、profile、entry-access、WalletRpcProvider、session、account-history-reader；涵盖真实SDK帧／trailer、错链优先、缺字段／非法范围、重复探测、迟到响应、会话替换、部分成功不显示0与账户历史独立合同。日志20261004-entry-identities-tests.log。本轮仅增加只读探针，没有修改钱包业务代码或重建产物。

NET-03完成，总体44/98；完整迁移仍继续，trial_ready=false。
