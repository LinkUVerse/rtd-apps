# C32 完整 NFT 转移准备期限

C31 已实际通过 60 秒复合 Kiosk 读取、S62279 五对象与两条 unsigned P2P 分支及当前 Chrome 两件 NFT 内容。但是 prepareNftTransfer 的顶层总期限仍为 20 秒，包含 fresh object、同快照源 Kiosk、可能的目标 Kiosk、最终 resolver/模拟；同一条已实测超过20秒的Kiosk读取被其调用方提前取消。需要修复准备链路，不能以 C31 读取正面代替可用转移预览。

- [x] N1：总准备期限为有界120秒，包含所有前置读取及最终prepare；所有子读取仍遵守原leaf期限/Kiosk60秒以及调用方signal，最终返回前仍检查signal、binding/readSession/sender。
- [x] N2：真实NFT准备函数的21秒发现后完整对象/能力检查和预览成功；120秒截止拒绝迟到结果且不触发prepare；调用方取消立即拒绝且无后续构建/模拟。
- [x] N3：当前相关/完整测试、类型及独立production闭包；当前实际内部NFT预览与原签名/执行/恢复合同分别验收。
- [ ] N4：direct/native/Personal/OriginByte真实转移、回执与写后读最终矩阵。

120秒是复合准备的总预算；单次读取/模拟仍有自己的更短期限。不延長签名授权、名称证明有效期、交易expiration或已批准bytes，不自动重构/签名/发送，不代表服务实际覆盖完整。

代码阶段实际证据：62项定向测试、184文件2601项全量测试、两套类型与C32 production build/audit均通过。N3中的真实内部预览及N4完整转移尚未完成。原before01/02失败保留。

N3后验由包含同预算修复的C33独立包完成，见`20261006-positive-C33-nft-previews-chrome-03.json`：三种真实内部NFT预览/6正式模拟/15检查和批准BCS、返回/relock、完整journal保持均通过；原签名/执行/恢复合同单列于N4及TX父任务，不以预览代替转移。
