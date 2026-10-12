# C33 NFT 准备和批准表单在快照临时加载时保留

C32 全量2601/类型/生产编译已通过。父 NftTransferPage 的 Loading 在对象/Kiosk快照轮换时卸载尚未dispatch的TransferNFTForm，子组件清理会abort真实准备；延长准备deadline不能修复这个UI生命周期。

- [x] L1：仅当前NFT实际preparing/已有approval的表单，在同binding/session/account/object的临时loading期间保留其type和实例；恢复null释放旧dispatch，取消批准释放prepare保留。
- [x] L2：明确错误、已完成发现但missing、锁定，以及binding/session/account/object改变，仍立即撤回原表单；type保留仅是渲染，不是能力或授权。
- [x] L3：真实父页面的实例保留/撤回与真实Form回调期间验证；当前完整测试/类型/独立生产闭包和真实内部NFT预览。
- [ ] L4：完整三种Kiosk/direct Execute/恢复/写后读与98父任务最终验收。

继续遵守完整 fresh object/BCS/Kiosk、原 approved bytes、最新权限/签名/expiration/pending检查。临时旧type不能用于跳过新请求身份、权限、持有关系或提交前复核。

L1/L2编码与真实组件定向核验已完成：76项通过，覆盖临时loading实例保持、已报告错误/missing/锁定撤回及binding/session/account/object切换；真实Form准备/批准/返回和失败回调均验证。明确错误指hook已报告的错误，不把未完成查询当作授权。当前全量2611测试、两套类型、独立C33生产构建和完整闭包通过，见`20261006-C33-coding-verification-01.json`。真实预览尚待共同覆盖，L3保持开放；36项严格入口门禁及5个真实H0仅是独立传输验证。

L3后验完成：`20261006-positive-C33-nft-previews-chrome-03.json`为真实C33 renderer/worker、controlled owner导入与indexed准入、direct/OB-existing/OB-create三种内部预览，15检查/6模拟，实际批准BCS/digest/gas与正式ENABLED模拟/effects逐项匹配，三次返回及最终relock/full journal保持；没有点击执行按钮、签名或Execute。首轮采集器误读Gas估算无BCS请求、第二轮两预览后返回form只等待5秒的失败均保留。L4仍开放，C35编码证明与本C33实链预览范围分开。
