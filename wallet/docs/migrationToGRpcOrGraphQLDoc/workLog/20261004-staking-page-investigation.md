# RPC-13 实际质押页面未通过与定位

新增可重复的RTD_TEST_STAKING_PAGE=1临时档案测试：进入#/stake、选择实际验证者、打开金额表单并验证0／1金额。当前尚未通过第一步，不得称为质押页面可用。新增金额断言尚未执行。

四次测试均保留独立日志：20261004-extension-staking-page.log、-diagnostic.log、-runtime.log、-render.log。最后明确：route仍#/stake，页面正文包含网络、主导航、“选择验证者”，validator-list-item计数0，无pageerror，无已观察到的错误提示。进程退出1。没有点击交易批准或提交。

独立只读probe-staking-portfolio.ts使用同一profile和公开测试账户，通过WalletAssetReader真实查询：checkpoint77876、positions0、validators1、requests13、dispatches0；证据20261004-staking-page-owner-probe.json及.log。接口成功不等于扩展页面通过。

待验证原因：Validators父页面先读取owner仓位，SelectValidatorCard另读无owner的系统视图，ValidatorLogo也使用系统视图；Provider每20秒刷新快照，组合读取本身有20秒预算。需要记录浏览器请求时序与取消原因，检验重复读取／快照刷新是否导致列表持续无法完成。此为待验证假设，不是已确认根因，不应据此盲目延长超时或降低验证条件。

本轮无业务代码变更；新增测试和只读诊断脚本。没有重跑1305项或构建。原保留执行档案未触碰，dev未重启。RPC-13／TRY均不勾选，40/98。
