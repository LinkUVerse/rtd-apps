# NET-11：九个读取展示入口统一公开错误

日期：2026-10-04。

## 修改

以下入口原先直接使用 error.message，现改为既有 walletReadErrorMessage：NFT 列表、NFTDisplayCard、Kiosk 卡片、账户历史 CompletedTransactions、TokensDetails 余额错误、active-coins-card、验证者选择页面、ValidatorsCard、质押 delegation-detail 页面。

NFTDisplayCard 的 wideView 与 horizontal／hover 名称区在 isError 时不渲染。现有 NFT 元数据 hook 已会在错误时返回 null；本次额外确保展示组件不会在错误分支旁边渲染名称占位或保留下来的名称／媒体状态，不声称已观测到真实旧 NFT 名称泄漏。

NFT 列表保留未配置／无效网络的明确本地 rpc.message，账户历史原有本地配置提示也保留。已确认链上失败回执中的业务原因、账户密码错误、Qredo 隔离服务错误、配置表单校验等不使用这批查询分类替换。没有改变执行重试、回退或 journal 规则。

## 检查

- 3 文件 33 项通过：公开错误分类 27 项、历史页面 3 项、NFT／Kiosk 展示 3 项。新组件测试使用实际组件与受控 hook 状态，验证固定公开提示、无服务原文、无旧名称／媒体。
- 首次测试因重复 mock 同一个 hooks 别名造成 2 失败，修正为一个 mock 后通过；初始 read-error-surfaces-tests.log 保留，最终 tests-fixed.log 为通过证据。
- 钱包 tsc exit 0（read-error-surfaces-typecheck.log）。

本项是 NET-11 的页面覆盖进展，尚不代表所有入口／故障已完成，Task 保持开放。


## 当前全量检查

`20261004-read-error-surfaces-full-tests.log`：127 文件 1351 项全部通过，16.17s。Webpack 34777ms 成功，四入口审计通过，分别见 build.log／artifacts.log。本轮新增或修改的展示组件与测试在此当前全量结果之内；不借此宣称浏览器／链服务全部验收完成。


## 实际 Chrome 注入与恢复

`20261004-read-error-surfaces-browser.log` exit 0，实际加载新构建后验证现有 10 个非视觉对象及空 Kiosk，再由 Playwright 仅拦截拥有对象查询注入 GraphQL errors（共命中 2 次）。NFT 列表显示“查询结果不完整或不兼容，未接纳数据”，无 package 对象行，也不输出服务原文。撤销注入并重新加载后，真实 S100566 返回完整 13 对象，页面恢复 9 个 package 类型行。

密码／锁定／错误密码拒绝／解锁／整浏览器重启继续通过，全程 0 模拟／0 提交。使用实际扩展与受控网络响应注入，不代表真实服务器宕机。其它八个展示入口未逐个执行本次 Chrome 故障注入；其编码与全量测试通过不提升为该运行结论。

当前 UI SHA256：1206db6d3bc6cba25418de38c5d2e476e6f4a41e20aa397086ddfe168b63cacf。
当前 background SHA256：d11c911981cc817408cea3374cf534728429b801dd46c3ef86d6eca0f092acc0。

精确 dev 叶证书 SPKI 测试边界不变；本轮未修改 dev 链或服务。
