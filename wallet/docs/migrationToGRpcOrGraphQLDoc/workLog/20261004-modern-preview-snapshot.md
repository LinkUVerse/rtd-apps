# 2026-10-04 现代地址资金预览快照修复

任务：RPC-04／RPC-15、TX-01预览输入边界。本批修复共享编码入口，完整资金／授权验收继续按Task保持开放。

## 实际问题和权威依据

原链恢复后，受控modern dApp复用生产addressFundedTransfer构造WMIG混合转账。实际Chrome批准页显示Invalid input，没有Approve按钮；后台0模拟0广播，原native journal保留。日志20261004-mixed-token-execution-admitted.log。更早一次资金准入测试错误地要求零coinBalance显式存在，0模拟0广播；根据本地get_balance.rs的render_balance确认零分量省略，已按严格typed envelope＋总额相等修正harness。

根因为usePreparedTransaction的React render仍调用Transaction.serialize()，SDK转旧v1输入时拒绝FundsWithdrawal，而非后台现代JSON不能解析。查阅Sui官方迁移页与固定SDK3c32c302625c7d4c63cd89597c34b86bcccdbcea的Transaction／v1／TransactionData源码；旧serialize弃用且同步场景可getData。官方原文与SHA在evidence/official/20261004-modern-preview/manifest.json。

## 变更

usePreparedTransaction同步JSON.stringify(getData())捕获现代快照，BigInt保持十进制；query key和异步queryFn克隆用同一字符串。后台请求绑定、持久pending、只允许最终固定bytes、正式模拟与执行均保持。业务代码中已无Transaction.serialize调用；BCS codec的serialize不是此旧接口。

新增内部／dApp提款9007199254740993回归、克隆不变性与ValidDuring大epoch保留。原测试缓存键改为现代快照。test demo新增只对127.0.0.1 HTTP localnet显式五字段live Coin绑定启用的token action，复用生产构造器，普通操作不变。

## 命令与验证

- node_modules/.bin/vitest run src/ui/app/hooks/usePreparedTransaction.test.ts src/ui/app/pages/approval-request/transaction-request/index.test.ts src/shared/rpc/transaction-reader.test.ts src/shared/rpc/coin-transfer-preparation.test.ts src/background/dapp-preparation.test.ts src/background/dapp-execution.test.ts：6文件121项通过，20261004-modern-preview-tests-fixed.log。
- node_modules/.bin/vitest run：130文件1406项全部通过，20261004-modern-preview-full-tests.log。
- ../node_modules/.bin/tsc --noEmit -p tsconfig.json：exit0，20261004-modern-preview-tsc.log。
- NODE_ENV=development，TS_NODE_PROJECT=./configs/ts/tsconfig.webpack.json，WALLET_NETWORK_PROFILES使用原profile03：Webpack5.104.1编译成功30063ms。
- python3 scripts/audit-wallet-provider.py及node scripts/audit-wallet-wire-closure.cjs：当前四入口通过，输出20261004-modern-preview-provider-audit.json及20261004-modern-preview-wire-audit.json。
- modern demo：3文件15项通过，Vite编译成功，分别20261004-token-demo-tests.log／build.log。该demo仅测试夹具，不进入wallet产品产物。

原复现单测2个FundsWithdrawal场景确实在旧serialize抛错；同一首次运行另有有效期测试fixture未更新mock返回值的断言错误，不能把它列为业务有效期缺陷。后续新断言一度误写reservation.Amount，已据SDK正确MaxAmountU64修正；两个失败输出均保留。生产修复后的121／1406项通过才计作最终结果。

当前产物：UI d6d455e86bc0056c81f0fc842e1893c9e22227f4608f32cda47afee620e4d270；background ad6bd1c74ee9c6694efba03785a28b773c048cdf8b564b229e6bd2ee99fd2c06；content-script dad81956648875bd39c4e82e9b37b1ab318e80c00fcf7592b2932ad5d29cba0b；dapp-interface 6afa3b9705b80ad993f81d806bc94828b6d1700dd8a7a82370ba531b5d52409d。

新构建首次热重载再次被Chrome ERR_BLOCKED_BY_CLIENT拒绝，原日志保留；关闭整个浏览器、同一profile冷启动后原native摘要只读恢复通过，当前worker源码与磁盘一致，0模拟0广播。之后非原生实际批准已进入正式模拟／一次广播，具体实链证明和原脚本限制见20261004-mixed-token-execution.md。

## 同步与限制

archive与合并钱包两套SDK／执行合同同步添加现代快照要求，原保留材料未修改。试用门槛和RPC-04未因修复或定向测试提前完成。
