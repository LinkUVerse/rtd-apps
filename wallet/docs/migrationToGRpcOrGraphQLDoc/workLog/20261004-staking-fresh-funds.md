# RPC-06／13：质押新鲜总余额（2026-10-04）

StakingCard 的执行输入资金上限由 GraphQL allBalances 改为 useFreshBalance(RTD_TYPE_ARG, account)，覆盖 Coin 与地址余额；索引快照继续承担验证者、仓位等展示职责。prepareStaking 在构建前读取 readFreshBalance，金额超过当前总余额或依赖读取失败时拒绝，未调用 prepareTransaction；最终正式模拟承担金额加gas的实际可支付性检查，gas payment不固定，允许节点选择地址余额reservation。赎回不增加与本金等额的流动资金要求。

成功／失败终结回执的 confirmed 分支刷新 wallet-assets、wallet-fresh-balance、wallet-fresh-coins；pending仍保持原摘要恢复流程。既有真实链探测脚本的 WalletRpc adapter 同步补齐 readFreshBalance，未运行新的实链质押。

验证：6个测试文件36项通过，覆盖准备器、质押／赎回页面、验证者展示、staking hooks、账户／会话切换的新鲜余额；完整钱包类型检查通过。证据为同目录 20261004-staking-fresh-funds-tests.log、20261004-staking-fresh-funds-typecheck.log。页面测试使用替身，不能当作Chrome或实链。

RPC-06／13继续未勾选：仍需完整页面合同审计与地址余额质押实链验证。旧Kit／Kiosk的19条core错误属于explorer消费分支，后续仍须完成NET-10保护消费者的工作，未通过删除文件、伪造声明或缩小检查范围规避。
