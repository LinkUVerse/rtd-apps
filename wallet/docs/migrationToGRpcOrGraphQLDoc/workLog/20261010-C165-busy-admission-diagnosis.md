# C165 live 第二轮批准不可用的原响应诊断

只读解码原 20261009-C165-current-four-nft-live-02.json 全部 GraphQL 响应，四个完整 NFT 表单加载阶段实际出现两次 WalletHistoryCoverage 错误：code=BUSY，message=Account query capacity exceeded.。该轮没有 SimulateTransaction、私有签名或批准，Approve disabled 是未获得有效准入的保守结果，不能将该轮标为通过。

当前执行改为每次只有一个大型浏览器验收，页面先等待正常请求 drain 后再导航；四个测试表单直接进入 NFT 页面，源检查在可见后执行，避免初始 token 页立即跳转造成取消。服务查询能力/准入合同不修改，错误响应不覆盖，token/journal 不注入。v4 在失败时另存不含私钥/密码的完整 UI 诊断，供区分持续容量问题与实际代码缺陷。

本诊断没有重开旧 profile、没有重播旧请求，原失败与一项未观察终态仍保留。只有新的真实 live 与完整独立审核通过，才能计入 TX-04。
