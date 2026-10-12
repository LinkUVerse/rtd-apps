# RPC-04：非原生资金实链准备与地址gas模拟修复

2026-10-04。该批发现并修复正式模拟的真实兼容问题，非原生地址及混合资金准备通过；没有批准或提交钱包代币转账，RPC-04仍开放。

## 受控测试代币

按要求仅使用link-u-smart-contract/all-in-one-deploy/localDeploy中的内容：新增wallet-coin-fixture/sources/migration_coin.move、prepare_wallet_coin_fixture.py、publish_wallet_coin_fixture.mjs及prepare_wallet_token_funding.mjs。重新核验当前RTD HEAD、diff、dirty文件、debug CLI与运行PID／H0，CLI从本地RTD框架编译，未换用release或其它链。发布脚本对管理账户既有pending逐一取原摘要的真实成功结果，并保留新intent、compiled、simulation、pending、receipt。一次性输出目录存在即拒绝覆盖。

测试代币使用6位小数的WMIG，TreasuryCap留给受控管理账户；有意使用仍受支持的legacy CoinMetadata用于验证钱包旧资产迁移，未把已deprecated的create_currency推荐为新生产代币设计。此合约无公开无权限铸币入口，后续种子由管理账户持cap调用标准coin::mint。

- 包：0x94d0592fc90479aa2c999a7ba34596031159244779ae0ba608196d14995fbf17。
- type：包::migration_coin::MIGRATION_COIN。
- 发布摘要：4TjHHoMYMwhW871KTd4J4cDs1HLMTaiHtSNp7Xtm7Qd6，成功。
- TreasuryCap：0xb20777c2d01b7917b6005dd51aaa1f679efdbbf9fd38e1e6f5abff3a99cb5e8f。
- Metadata：0x07177348b70e78bbc82de522b3b08843a77f72835ab358fda50142dcce3a19ae。
- 目标沿用0x1cedd5e3a0e54992fcf62656b0ec9b69aa0a93aca99e2d404a1fc77bac23b126，原混合原生转账HR27Xmrhd2KPsN4YDCbJzsBYkmcpnnf3NN1m2kW5rEUd已先取回成功结果，不重发。
- 种子摘要447hWGinSMrYFCf9eeAvKa2X1kFb6j9W4g5R1L1kSnBy，一次管理提交成功；目标非原生Coin=1000000、addressBalance=1000000、total=2000000，真实读取成立。
- 私有runtime/coin-fixture-build-01、coin-fixture-publication-01、token-mixed-funding-01保留原材料，不得重跑发布或种子。

## 发现的问题与权威结论

首次生产WalletTransactionReader准备0.5枚代币失败于最终effects摘要不匹配，记录在20261004-token-mixed-preparation.log；没有签名或执行。第二次只读诊断保留完整模拟请求和响应：原BCS及回传BCS的摘要同为DuG8XfhVNLsAUFJFRd4K5xL9iCjWzSJArWetTFu6YSW7，但effects为HWdKCAVQZEgC8JDYDGY1QdpZ38w7adC8wEBm5t2DScxV。

[Sui固定transaction_simulation.rs](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-core/src/transaction_simulation.rs)在允许mock且gas payment为空、非gasless时加入虚拟gas Coin，再计算effects摘要；[RPC simulate/mod.rs](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-rpc-api/src/grpc/v2/transaction_execution_service/simulate/mod.rs)以!perform_gas_selection控制mock开关。本地当前RTD同名代码一致。此问题与代币withdrawal BCS无关，而是目标原生资金已经全部为地址余额，解析选择了空payment的真实地址gas。

原字节对照实验仅把doGasSelection切为true，成功后返回BCS、原摘要和effects摘要一致，0提交，见20261004-address-gas-simulation-control.json。因此旧方案“所有最终模拟统一false”的表述不正确，已同步修正双方SDK、交易执行及接口矩阵。

WalletTransactionReader.prepare与simulate现依据已固定bytes的gasData选择模式：payment=[]且price>0使用true以禁止mock注入；Coin／reservation payment以及gasless继续false。仍只发原BCS，并要求回传BCS、effects摘要、字段与重新编码结果完全一致。余额变动使服务端重选Coin或改变有效期时拒绝，不能采用新字节、覆盖批准或忽略摘要错误。

[Sui coin.move](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-framework/packages/sui-framework/sources/coin.move)与本地redeem_funds／send_funds语义核对成立：钱包非原生交易先提取地址资金，按需合并Coin，拆分后把剩余新Coin转回sender。

## 验证

- transaction-reader新增3项回归：地址gas准备及复核的同bytes；服务端改选资金产生自洽新effects仍拒绝；gasless不启用该分支。原Coin路径也保持false。
- 4文件83项通过：transaction-reader、coin-transfer-preparation、address-funded-transfer、prepared-wire。
- 完整wallet tsc通过；开发Webpack成功52103ms，编译Local配置保持。
- scripts/probe-live-token-funding.ts实际使用生产余额／Coin／准备／重新模拟reader；0.5枚（地址覆盖）、1.5枚（地址＋Coin）、2枚（全部代币）都通过，共9次真实模拟、0签名、0执行。接收和发送的代币变化分别为±500000、±1500000、±2000000，不从代币扣RTD gas。
- 最终gasPayment均为空，gasPaymentKind=addressBalance，Validity保留epoch2–3及H0／proposer约束；1.5和2枚包含redeem、merge、split、接收方转账和sender找零。完整诊断证明6次固定bytes正式／复核请求全部为true。

主要原始证据：20261004-coin-fixture-publication.log、20261004-token-mixed-seed.log、20261004-token-mixed-diagnostic.json.diagnostic.json、20261004-token-mixed-preparation-fixed.json及其diagnostic.json、20261004-address-gas-regression.log、20261004-address-gas-typecheck.log、20261004-address-gas-build.log。未签名模拟摘要不是链上交易摘要。

非原生钱包实际UI批准、原摘要持久恢复、metadata索引追平和全部发送UI仍待。目标两枚WMIG当前未花费，原生地址余额仍498990120。总进度不因准备通过而勾选RPC-04或TRY-02，保持48/98。


## 新产物与保留配置复核

Provider和四入口构建产物静态审计通过。UI SHA256为b02611b529744eec74b283463863f0e6d5846b720302fa4a85a7999ffc7ec502；background为67ed736276452d8835d7c19d28ff29c4928bd49b9a6d55b784005cdb530a50cd；content-script及dapp-interface摘要不变。首次保留Chrome配置在worker热重载阶段ERR_BLOCKED_BY_CLIENT退出，0模拟0执行，原日志保留；整个浏览器已关闭后，以同一保留目录冷启动，只读恢复通过，新worker与磁盘一致。原混合原生HR27摘要、唯一成功journal、锁定账户、cp398996及原生地址余额498990120保持；0模拟0执行。证据20261004-address-gas-retained-cold-recovery.log。此验证只证明新产物仍可恢复旧成功交易，不冒充新非原生UI批准。文档完整性验证13章节、14原文、22验收项及21线协议方法映射通过。
