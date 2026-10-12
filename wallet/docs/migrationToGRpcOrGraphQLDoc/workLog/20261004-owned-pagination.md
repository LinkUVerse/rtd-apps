# RPC-03 真实拥有对象跨页核验（2026-10-04）

## 代码

WalletAssetReader.ownedObjects增加可选pageSize，默认50，合法范围为1–50整数，非法值在发出查询前拒绝。查询用GraphQL Int!变量传入first；仍由同一collectSnapshotPages累积整个固定快照，重复ID／游标停滞／页数与总量预算／取消／终页复核合同不变。不向UI交付部分页。较小页用于控制单次响应体量；原消费者继续使用默认50，并非把集合截断为pageSize。

## 真实接口

scripts/probe-live-owned-pagination.ts经保存的profile03 revision2读取本机认证GraphQL，共同快照89079：部署账户13个对象，默认50单页与pageSize3实际5页结果深比较完全一致，包括对象顺序、owner、版本、BCS、JSON、display和snapshot。每页cursor承接前页endCursor，前4页hasNextPage=true、末页false，ID无重复。全程仅GraphQL／GetServiceInfo，没有签名、模拟或提交。证据20261004-owned-pagination-live.json及20261004-owned-pagination-live-retry.log。

返回1项实际Display：OriginByte OwnerToken名称Originbyte Kiosk、description、kiosk、link、owner，errors=null。这证明该已持有OwnerToken的Display映射，不等同普通直接NFT display或Chrome渲染通过。没有伪造分页响应、改服务端数据、生成新夹具或绕过索引覆盖。

首次探测脚本把响应误按data.address读取，实际为data.walletSnapshot.query.address，断言失败，保留20261004-owned-pagination-live.log。修正探测层级后重跑通过，生产reader没有因此修改。

## 测试、产物与未完成范围

- asset-reader30项、snapshot-pagination4项通过；命令额外列出的nft-assets.test.ts不存在，实际仅2文件34项，按日志计数。
- nft-hooks、hidden-asset-preferences、kiosk-reader实际3文件32项通过。合计5文件66项，不冒称全量。
- 钱包完整tsc通过；Local profile03 revision2开发Webpack成功，35669ms；四入口产物静态审计通过。对应owned-pagination-typecheck/build/artifact-audit日志完整保留。
- 新UI SHA256为8e70974e8ed092f6cc97117107e30e14608a1d3eb773f8187d70beef47a696d2；后台仍3a85161e43e83c72be22dc6808dd20feea7b021ad3605c65bf31d7e45263eb10。未重跑全量、未进行Chrome验收。

RPC-03仍待普通直接NFT Display与页面交互完整验收；RPC-22个人Kiosk发现／转移仍受索引进度限制。Task不勾选，41/98、trial_ready=false不变。开发链未更换／重启，无新链上交易。
