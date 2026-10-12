# RPC-04：混合原生资金的实际准备与Chrome预览

日期：2026-10-04。RPC-04／TRY-02继续未完成；本批补齐真实Coin＋地址余额的定额和发送全部准备，以及实际扩展定额预览。没有执行钱包发送。

## 受控资金准备

指定仓库新增all-in-one-deploy/localDeploy/prepare_wallet_mixed_funding.mjs，使用同一现有debug dev，复核当前RTD HEAD／diff／dirty文件摘要、debug CLI摘要、运行PID、H0及本机入口。管理账户与目标账户此前的所有runtime pending均核对本地成功receipt及原bytes摘要；不涉及旧deployer未决账户。

- 管理账户：0x11e90d26087af15981c5e7d0739ce58886755f1ac83ebaeb1f7c643b87e5f614。
- 目标：0x1cedd5e3a0e54992fcf62656b0ec9b69aa0a93aca99e2d404a1fc77bac23b126，是此前纯地址余额发送全部成功后余额为零的受控测试账户。
- 新seed一次派发，digest 6TAz5CW2KUTDHVZjDfT2L2U4BXtEL6zh4WqA39vtAcdf，成功checkpoint395329。一条PTB转入1 RTD Coin及通过0x2::coin::send_funds存入1 RTD地址余额。
- 私有runtime/mixed-native-funding-01保留intent／simulation／pending／receipt，不可重跑。密钥仍只在address-funding-fixture-01/keys.json，不输出到日志。

seed在成功回执之后立即查询余额，coinBalance字段缺省，断言失败；失败日志20261004-mixed-native-seed.log保留。不能将该错误解释为交易失败或再发seed。之后只读原摘要恢复和新鲜余额核验：Coin=1000000000、地址=1000000000、合计2000000000，真实Coin对象总和与分量一致。源码已将后置读取改为最多20次有界只读轮询并保存观测；该轮询修改只做语法检查，未为验证它再提交seed。

## 实际生产准备器验证

scripts/probe-live-mixed-funding.ts使用WalletFullnodeReader、WalletTransactionReader、prepareCoinTransfer和revalidateCoinTransfer，不签名、不提交。6次正式模拟：两个用例各包含解析、固定bytes模拟及批准前同bytes模拟。

- 定额1500000000，大于任一单独资金分量；模拟实际接收1500000000，净gas1009880。
- 发送全部2000000000；最终gas payment包含当前Coin精确objectId／version／digest以及epoch绑定coin reservation；模拟接收1998990120，等于总余额减净gas1009880。
- 两者使用明确Validity：epoch2–3、同H0、nonce及proposer约束；没有改动固定bytes，也没有用GraphQL资产余额构建。
- 仅访问GetServiceInfo、GetTransaction、GetBalance、ListOwnedObjects及SimulateTransaction；派发0。证据20261004-mixed-native-preparation.json/.log。

## 实际Chrome

在已有账户生命周期测试器增加严格只预览的RTD_TEST_MIXED_NATIVE模式，使用上述受控target密钥实际导入、设置密码；禁止与执行、dApp、旧deployer或创建随机助记词模式混用。币预览helper参数化amountText／atomicAmount，默认原1原子单位不变。

实际完整扩展当前worker e355c0d81dbf3dc4e2eef83bac004ec6a549dc891124227c5826ab5f78799c5b与磁盘一致；1.5 RTD自转预览经过真实表单、Review与最终批准页，按钮可用、有效期可见，返回表单通过。批准0次、SimulateTransaction2次、ExecuteTransaction0次；账户锁定／错误密码／解锁及浏览器重启检查通过。证据20261004-mixed-native-chrome.log。

GraphQL共同快照S130882早于入账checkpoint395329，所以资产查询为空；记录为真实旧快照空集合，不作为当前Fullnode零余额。此次发送预览使用新鲜Fullnode资金成功，不声称资产索引追平。证书仍使用精确SPKI例外。

## 剩余工作

本批未改变业务源码或构建，脚本语法及真实运行结果分别记录。混合资金实际钱包提交、非原生Coin／地址余额、发送全部实际UI提交及完整页面合同继续由RPC-04／TRY跟踪。当前目标保留2 RTD混合资金可用于后续验证；不得把未签名模拟digest当作已提交交易。总体仍48/98，trial_ready=false。
