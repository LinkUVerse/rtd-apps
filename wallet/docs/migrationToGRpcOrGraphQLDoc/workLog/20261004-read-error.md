# NET-11：资产读取错误公开展示

2026-10-04。发现NFT详情／转移前读取、Kiosk详情和隐藏资产页直接渲染error.message，可能展示上游原文。本轮统一使用固定公开提示，区分取消、服务暂不可用、预算、权限、参数、未实现、缺失、链身份和快照完整性错误。

## 边界

新增classifyWalletReadError与walletReadErrorMessage，仅用于读取错误展示。SDK RpcError按结构化状态码分类，本地已知错误按实际类和reason分类；未知异常、普通TypeError和伪造code对象保持未知，不根据文本推断。未改变原异常，保留底层NOT_FOUND分支、归档回退、原摘要恢复及一次提交行为。retryableRead不自动触发请求。

依据：https://grpc.io/docs/guides/status-codes/ 。官方说明DEADLINE_EXCEEDED可能在写入成功后出现，UNAVAILABLE也不保证非幂等操作可重试，故分类器不用于execute。

## 验证

- `20261004-read-error-tests.log`：2文件32项通过。27项错误分类／不泄漏服务原文／不修改原错误／未知状态（含原型键）防御测试，另5项真实Provider到余额Hook集成回归。
- `20261004-read-error-typecheck.log`：完整钱包tsc退出0。
- `20261004-read-error-build.log`：webpack成功，现有构建警告保留。
- `20261004-read-error-static-audit.json`：最终四入口产物静态审计通过。

未执行本批4页面的Chrome渲染或真实服务故障验收，也未宣称全钱包所有错误已统一。端点／operation／trace观测和其它页面覆盖仍待推进。双方方案、Task和总进度已同步，NET-11未勾选，总体34/98。
