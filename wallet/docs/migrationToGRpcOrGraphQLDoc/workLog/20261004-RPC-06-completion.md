# RPC-06：单币余额、发送前资金与页面接入完成核验

日期：2026-10-04。核验 Task RPC-06 的接口编码和页面接入，不替代 RPC-04 全部资金构建、TRY 真交易或 QA-A05 故障矩阵。

## 合同与源码

| 必需行为 | 当前实现与证据 |
| --- | --- |
| 资产单币余额来自完整固定快照 | useGetAllBalances 通过 openAssetSnapshot().balances 全分页；绑定、读会话、快照共同入 key；错误隐藏旧数据；TokensDetails 只在完整结果存在且无币项时返回0 |
| active-coins／tokens接入新模型 | ActiveCoinsCard 与 TokensDetails 都消费新 balance；filterAndSortTokenBalances 使用 bigint 排序且不修改缓存；未伪造 coinObjectCount／lockedBalance |
| 发送前新鲜余额 | useFreshBalance 经 WalletFullnodeReader 原生 GetBalance，coinBalance 与 addressBalance 精确合计；SendTokenForm 同时读取发送币和 RTD gas 总额，错误阻止表单 |
| 准备前复核 | prepareCoinTransfer 再读新鲜Coin与总额，Coin分量与分页引用金额不符、超额或发送全部金额变化均拒绝；固定bytes在签名前再模拟，不静默重建 |
| 质押表单接入 | StakingCard 使用 Fullnode 新鲜总余额，错误／未完成／元数据错误阻止准备；prepareStaking 再校验资金，gas可支付性由最终正式模拟确定；赎回不强制要求同本金流动余额 |
| 精度及失败 | fresh-balance 测试覆盖可省略的零分量、超过 Number 安全值、缺消息／总额、错类型、总额不一致、水位倒退及迟到取消；余额不得在依赖失败时变成可信0 |

## 本轮实际扩展证据

脚本 `test-extension-account-lifecycle.cjs` 增加有资产的受控 dev 账户只读模式。只接受指定 runtime 的 keystore 和已知 deployer 地址，在内存中转换导入格式，不输出密钥或密码。账户通过真实扩展 UI 导入，密码保护、锁定、错误密码拒绝、重启锁定与再次解锁均验证。

- `20261004-funded-extension-assets.log`：S62807，原生余额149998999543361456，1个币种。
- `20261004-funded-extension-rendered.log`：S62929，digest `LjVMcW2NJ9H9WmG4GGR4FyNwugEc7jCzv8KLDBKnuD5`，相同原子余额。使用独立 bigint 算术验证页面实际可见 `149.99 M`。UI／background bundle SHA-256与浏览器版本一并记录。
- 两次实际扩展运行的观察范围内 ExecuteTransaction 请求均为0；没有进入发送页面、发起新交易或清理既有 pending。临时浏览器目录只用于读取，本轮未以新 journal 绕过旧 pending。
- 仍使用编译时审定 Local profile 和精确开发证书 SPKI 例外，不计正常 CA／自定义权限验收。

## 定向验证

`node_modules/.bin/vitest run src/shared/rpc/fresh-balance.test.ts src/shared/rpc/fresh-coins-hooks.test.ts src/shared/rpc/balance-ui.test.ts src/shared/rpc/coin-transfer-preparation.test.ts src/shared/rpc/staking-preparation.test.ts src/ui/app/staking/stake/StakingCard.test.ts src/ui/app/pages/home/tokens/coin-balance/index.test.ts`

7文件65项通过，输出 `20261004-RPC-06-tests.log`。测试脚本 Node 语法检查通过。本轮仅扩展验收脚本及文档，生产产物未变，因此没有重复构建；仍使用上一轮 Local profile 构建，其哈希与本轮证据一致。

RPC-06 完成；RPC-04、TRY-02／05、QA-A05仍未完成。真实混合／非原生发送、完整多币／多页UI故障回归和 dApp 仍需继续验证。
