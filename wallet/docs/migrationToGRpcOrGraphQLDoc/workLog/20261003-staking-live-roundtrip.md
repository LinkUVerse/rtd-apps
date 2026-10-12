# 钱包质押读取、准备和受控实链往返

日期：2026-10-03。独立当前源码debug链 H0 `3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj`，generation `dev-20261003-01`；没有操作原归档链。

## 实际钱包路径

新增 `scripts/probe-live-staking.ts`，使用真实 WalletAssetReader 的共同快照、staking 系统／动态字段／验证者／兑换率与仓位读取；使用 WalletFullnodeReader 当前对象与页面共用的 prepareStaking／revalidateStaking，再交给 WalletTransactionReader 正式模拟。读到 epoch 2、1 个验证者，质押前仓位为 0。不是构造接口响应或模拟BCS fixture。

受控金额 1000000000 原子单位（1 RTD）。准备器产出的原始 bytes 写入独立runtime，使用指定 `link-u-smart-contract/all-in-one-deploy/localDeploy/execute_wallet_fixture.py` 绑定当前debug CLI／同H0，正式模拟原bytes、验签、先持久记录摘要签名后单次execute-signed-tx。

质押成功摘要：`F5Ar9TSBb3L6Datg8mRmeJAz7pRcgXTNmxYJv6LrcQUN`。
新增仓位：`0xffb9480a033b7aab95b4e88efbc08a11bcdf93f78921f5f52b131f56e9064ba2`。

共同快照 checkpoint 52619 读到该仓位；钱包赎回准备器检查Fullnode当前所有者和原生BCS的本金／pool／activation，并完成构建、正式模拟及同bytes再次模拟。当前epoch 2、activation epoch 3，因此这是 pending 仓位赎回，不宣称活跃奖励赎回已验。

赎回成功摘要：`8RZQyBMQVAXxp2H1LJD2q3dNrGzKNBvXjVQvV3vUi48P`。
随后共同快照 checkpoint 52865 仓位数回到 0，断言通过。

## 证据与边界

- 读取：[首次系统与仓位](../evidence/20261003-live-staking.json)。
- 页面共用准备器：[质押准备](../evidence/20261003-stake-fixture-prepared.json)、[赎回准备与原仓位](../evidence/20261003-withdraw-fixture-prepared.json)。
- [实链往返回执及仓位核验](../evidence/20261003-staking-live-roundtrip.json)、[赎回后钱包读取](../evidence/20261003-staking-after-withdraw.json)。
- 原始bytes／签名／单次dispatch日志在独立runtime。首次执行器传入SDK仓库根而不是packages/typescript，正式模拟在模块加载阶段失败；没有签名或dispatch，原失败日志保留，修正路径后使用新的日志名执行同一bytes。

本轮没有新增钱包业务实现，仅新增真实路径探测和证据。CLI提交不等同background journal／Chrome批准链路，仍缺实际扩展、active stake跨epoch奖励、inactive pool等完整验收。RPC-10–13／TRY不因本次受控场景直接全部勾选；总体16/98，仍未达到试用门槛。
