# NET-12／RPC-03／22：资产读取期间的后台快照轮换

日期：2026-10-04。部分回归，不提前勾选RPC-03／22或TRY-05。

## 发现与复现

原开发链恢复后的共同资产窗口已经可读：生产reader接纳S143051的余额／元数据、S143205的13对象。首次Chrome显示10个非视觉对象和Kiosk卡片，但打开详情45秒仍在加载；失败保存于20261004-owned-assets-cold-restored-chrome.log，0模拟0提交，未记通过。

独立生产Kiosk读取成功，准入1174ms、内容读取13000ms，返回同一OriginByte Kiosk的空内容，见20261004-kiosk-recovery-diagnosis.json。页面在读取过程中反复换assetSnapshotKey。可控真实Provider／TanStack／SDK Fetch测试进一步复现：三页分别7000ms，每页在HTTP预算内，总列表超过20秒；旧周期轮换发起第二次准入并取消尚未完成的读取，不能形成完整集合。

最初单个长请求测试失败输出保留在snapshot-rotation-before-fix.log；最终复现使用三页有界请求，见before-fix-pages.log。修复后的首个测试又在虚拟时钟通知尚未刷完时断言失败，保留snapshot-rotation-tests.log；修正测试时钟推进／通知等待，不修改服务超时或生产读取校验。

## 变更

WalletRpcProvider使用同bindingKey／readSession的真实wallet-assets活动查询数，在读取期间暂停周期、聚焦和重新联网的自动准入；读取完成后恢复20秒空闲周期。显式refreshAssets维持原语义。profile／generation改变仍立即关闭旧session并取消请求，读失败仍撤下旧data，所有原coverage／digest／分页及超时预算保持。

新增两项集成回归：完整三页读取跨原轮换周期不取消，完成后再次刷新；读取未结束时切generation立即取消旧请求且只呈现新会话数据。双方网络／缓存方案追加同一合同，不改变Sui协议或拼接Fullnode资产。

## 验证

- 6文件124项定向测试通过；最终Provider共7项。snapshot-rotation-tests-final.log。
- 修改后完整钱包130文件1408项通过，完整tsc通过。snapshot-rotation-full-tests.log／tsc.log。
- 开发Webpack成功43629ms；Provider及四入口AST／模块审计通过。snapshot-rotation-webpack.log／provider-audit.json／wire-audit.json。
- 本次首次修复产物UI a38822025bf4792b68ac245a19ba606e90a00ce35c3e9a3ada23429ee3830e6c，background ad6bd1c74ee9c6694efba03785a28b773c048cdf8b564b229e6bd2ee99fd2c06，四入口摘要在snapshot-rotation-build-hashes.json。
- 真实Chrome新临时档案通过S144419余额、10个非视觉行及链接、Kiosk卡片、空详情和Explorer链接；实际私钥导入／密码、锁定／错误密码拒绝／解锁、整个浏览器重启保留通过，0模拟0广播。owned-assets-rotation-fixed-chrome.log保存实际worker一致性和UI摘要。

该场景使用精确开发证书SPKI例外，compiled Local profile；没有正常CA／自定义权限、直接NFT display、隐藏资产、非空Kiosk或转出验收。WMIG部署及发送在400826／409864，当前资产S仍早于它们，不宣称metadata或写后读追平。后续发送页元数据缺失文案改动另记日志与最终产物，不覆盖上述构建／Chrome证据。
