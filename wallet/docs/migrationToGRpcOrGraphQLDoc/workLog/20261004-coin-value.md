# 币种详情法币估值错误修复

## 问题与变更

TokensDetails 把 activeCoinType 传入 CoinBalance，但 WalletBalanceUsd 内部仍固定 RTD_TYPE_ARG。非原生币会按 RTD 元数据精度与价格估值。现已把 type 透传给 useBalanceInUSD，保留完整 bigint amount。另将零数值与 null 区分，有效 0 显示 ~$0.00 USD；未知估值仍省略。

## 验证

- 新增真实 React CoinBalance 组件测试，mock 价格／元数据依赖；覆盖从 RTD 切到非原生币、完整原子金额传递、有效零与 null 区别、非 mainnet 不请求报价。
- 修复前两个用例复现失败，见20261004-coin-value-before.log；修复后组件＋balance-ui＋coin-format 共3文件19测试通过，见20261004-coin-value-tests.log。
- 钱包完整 TypeScript 检查通过，见20261004-coin-value-typecheck.log。
- 双方 SDK 合同同步补充估值币种绑定与未知／零的区别。

本轮不验证第三方真实行情或 Chrome 页面，不将本缺陷修复等同 RPC-06 整项完成。总体维持33/98。

开发扩展 webpack 构建通过（31.7秒），四入口 Provider／旧 RPC 静态审计通过，见20261004-coin-value-build.log及20261004-coin-value-provider-audit.json。构建仍有既有Tailwind歧义类警告；不代表真实Chrome动态抓包或交互验收。
