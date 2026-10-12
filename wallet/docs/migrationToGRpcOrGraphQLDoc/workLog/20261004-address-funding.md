# 地址余额发送迁移（2026-10-04）

关联 RPC-04、TRY-02；均保持未勾选。本批补齐发送表单总余额、实际 WalletRpc 准备器资金判断、纯地址余额及混合资金交易构造。

## 代码与权威核查

- SendTokenForm 使用 useFreshBalance 的总 balance 作为发送金额和原生 gas 资金上限；listCoins 保留 Coin 引用。执行后清理 wallet-fresh-balance 查询。
- prepareCoinTransfer 比较实时 Coin 分量和分页 Coin 总额；读取期间发生变化拒绝预览。addressBalance 非零时校验正 u64 原子金额、精度、发送全部总额。
- 原生地址资金使用 GasCoin 命令并保持 gas payment 未指定，由 Fullnode 正式模拟选择 Coin 与 coin reservation。非原生资金显式 redeem_funds，混合 Coin 后的新剩余 Coin 转回发送人。
- 初版“预估预算后空 gas payment + GasCoin”虽然通过 mock 测试，但源码核查发现它会限制节点选币，且部分协议会拒绝该组合，已删除。最终实现不使用该两次预估方案；initial-tests、旧 address-funding-tests/rpc-suite 日志仅作为修改过程记录，不能作为最终实现证据。
- 权威依据：[Sui 固定提交 select_gas](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-rpc-api/src/grpc/v2/transaction_execution_service/simulate/mod.rs)，本地 RTD 对应函数位于 crates/rtd-rpc-api/src/grpc/v2/transaction_execution_service/simulate/mod.rs。节点在 GasCoin 被使用且协议允许时，将可用地址余额编码为 epoch 绑定的 coin reservation 纳入 gas payment。
- WalletTransactionReader 仍会对最终 bytes 使用 checks=ENABLED、doGasSelection=false 复模拟；批准结果绑定原字节，不重新选币。两边现行文档同步补充该合同，冻结原始副本未修改。

## 已验证

- 最终逻辑的 RPC 全目录：54 个测试文件、779 项通过，见 20261004-address-funding-rpc-final.log。
- 完整钱包 TypeScript 检查通过，见 20261004-address-funding-typecheck-final.log。scripts 不属于钱包 tsconfig 的 include；实链探测脚本实际执行通过，不能冒充脚本独立全量类型检查。
- 独立 dev 使用当前指定源码 debug 产物；fixture 脚本与执行探测均复核 HEAD、diff、逐个 dirty 文件和 debug 二进制 hash。未重新初始化开发链。
- 部署脚本 link-u-smart-contract/all-in-one-deploy/localDeploy/prepare_wallet_address_funding.mjs 创建两个新测试账户，一次显式本地 faucet 请求后，一次 send_funds 向目标存入 1000000000 原子单位。密钥仅保存在本地私有目录，不写入仓库证据；该脚本不是用户钱包操作。
- 真实纯地址余额读取 coinBalance=0、addressBalance=1000000000。实际钱包对指定金额1原子单位和发送全部均完成 prepare + 固定字节复模拟，dispatch=0，见 [准备证据](./20261004-address-funding-live.json)。
- 随后目标新账户通过实际钱包准备器／执行 reader 完成发送全部、SDK测试密钥签名、gRPC验签、单次 dispatch、原摘要 lookup。摘要 `7TkhqDHLitL6sAzwXvwb4TyJCpTiJqR5wVxTuyCKfEE`；receipt success=true，lookup返回同摘要，发送账户余额归零。见 [执行证据](./20261004-address-funding-execution.json)。该账户未参与此前待恢复的两笔 coin 探测，未重发旧交易。

- 最终源码开发 Webpack 构建成功（26.699秒），四个新产物入口静态审计通过，见 20261004-address-funding-webpack.log 和 20261004-address-funding-built-audit.json。未运行本批生产构建；静态审计不等于浏览器动态请求验收。

## 验证边界与下一步

本批未验证混合原生资金、非原生地址余额的真实执行；单测覆盖构造不能代替实链。未完成 Chrome 创建／导入账户、后台签名、产品 IndexedDB journal 或重启恢复验收。因此不勾 RPC-04、TRY-02，不提升可试用结论。继续完成剩余资金模式、coin 页面合同及共享依赖闭包。
