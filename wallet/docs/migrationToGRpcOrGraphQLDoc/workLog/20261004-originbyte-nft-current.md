# OriginByte 早期 NFT 的当前查询与转移构造验证

日期：2026-10-04。

## 已验证

使用实际保存的 wallet-profile-20261004-03/profile.json，在既有开发链和查询服务上读取，没有重启服务、修改 profile 或重新部署样本。

首次非空 Kiosk probe 遇 TimeoutError，保留 `20261004-originbyte-nonempty-current.log`。重试在认证快照 **109089** 读取到 0xaaa 的既有 Kiosk 及其中一件 MigrationNFT，见 `20261004-originbyte-nonempty-retry.json/.log`。这取代早期快照25703的空集合结论；历史失败证据未覆盖。

新增 `scripts/probe-live-originbyte-nft-path.ts`。首轮在同一认证快照 **109433** 验证两个早期转移夹具：

- 0xaaa：NFT `0x8cc8f37d35260c758a130706d0459ddc5047f0b77557e80a99dc9c610d93109e`，版本11，serial=1。
- 0xbbb：NFT `0xfec204014e6b7866fb13d3798cfce27349d61ad4fc86951158ac34fbaea02a78`，版本12，serial=2。

实际 WalletAssetReader 证明 OwnerToken、Kiosk、内容登记及锁定状态，按对象ID再次读取详情，与内容列表核对版本／摘要。实际 WalletFullnodeReader 的版本、摘要、类型、父对象和完整内容BCS均与该快照一致。两件对象display均为null，不能计为Display模板验收。

对真实OwnerToken调用生产分类函数，验证其可见分类及隐藏后不重复出现在可见集合。这是分类函数验证；UI有意不提供Kiosk能力对象的隐藏按钮，因此不将此记录为用户可操作的隐藏资产验收。

实际调用 appendOriginByteTransfer，以另一已验证夹具所有者作为收款方，分别生成配置包下的 ob_kiosk::p2p_transfer；NFT类型来自实际对象。错误发送者被拒绝。首轮证据：`20261004-originbyte-nft-path.json/.log`。

## 两条收款路径复核

扩展脚本后再次执行，在认证快照 **109849** 重做两件NFT全套读取与交叉核验。实际查询确认0xccc没有Kiosk后，由生产构造函数为两件NFT分别生成 `p2p_transfer_and_create_target_kiosk`；已有目标分支仍生成 `p2p_transfer`。两类指令的配置执行包、模块及真实NFT类型均逐项断言通过。131次只读请求，0模拟／0提交；见 `20261004-originbyte-nft-two-routes.json/.log`。此为最终脚本执行证据，首轮证据对应扩展前版本。

## 验收边界

允许的请求仅本机 GraphQL、GetServiceInfo、GetObject，未读取私钥；**0模拟、0签名、0提交**。这里的构造是未解析gas、未产生可批准最终bytes的交易指令，不能称作完整 prepareNftTransfer 成功或钱包实际转移。

测试地址0xaaa、0xbbb没有已知签名账户，不为签名验收伪造所有权。PersonalKiosk较新样本、直接NFT Display、隐藏偏好持久化／Chrome交互及钱包完整NFT转移仍待。RPC-03、RPC-22、RPC-23保持未完成。

本轮仅增加实际只读验证脚本与文档，未修改生产钱包或构建产物；脚本由tsx实际执行，不宣称钱包tsconfig覆盖scripts，也未重复全量单测／构建。
