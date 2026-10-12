# 当前 C42 全 Kiosk 分支前置

QA-A07/RPC-22/TX-04 的当前分支实测前置，父计数不变；不重复历史转移、不开历史profile。

- [x] K1：完成恢复和C42 source/十依赖共同窗口下，生产reader完整读取两受控账户全部framework/Personal/OriginByte Kiosk、cap与当前内容，记录真实空/非空/locked/listed分支；不依赖过去已转出NFT为当前持有。
- [x] K2：各实际cap、Kiosk/root和NFT新鲜Fullnode规范BCS/owner/version/digest/contents逐项比对，所有ownership/transferability判断按同链package pin；不将尚未满足的分类或UI接受当通过。
- [ ] K3：依据K1/K2实际可用分支继续当前Chrome的所有分支转移前验证/竞争与持久恢复；缺失分支的新增夹具必须单独明确合同，并等待真实索引覆盖，不能伪造水位。

本清单不批准新交易；实际模拟/批准/发送仍按原任务完整门槛逐项执行。

## 当前限定结果

production02及independent02通过，S293018，55完整原帧、37GraphQL/18RPC、六新鲜canonical对象；两个owner各native/OB完整owned读取共四自然终止页。发送方framework/Personal/OriginByte共三个空Kiosk，接收方无Kiosk；0非空/locked/listed NFT，不能作可转移性正面证据。Personal nestedcap/OwnerMarker与OB v3内部cap/空NftRefs table独立审核通过，OB OwnerToken仅discovery。

production01失败是探针误把OB当framework读取ownerCap，已按真实kind区分authority；原失败保留。independent01失败是审核误要求Display可继续推进的historyCoverage尾部完全相同，修正为同S/Sdigest/H0/generation和body不变、分别验证两真实coverage；不是产品数据失败。

[当前三空分支Chrome01](./20261007-C42-empty-kiosks-chrome-01.json)及[独立02](./20261007-C42-empty-kiosks-ui-independent-02.json)通过16项、230原采集帧、S295110、三fresh canonical typed帧补充；真实三个卡片/空详情/无NFT或转移链接/返回刷新/三store不变/正常重锁与自然关闭。228帧200，实际一503/一504及四关闭采集取消保留；独立01未识别504而失败，不重写失败。完整K3的非空/locked/listed/竞争矩阵仍开放；QA-A07/RPC-22父项不勾。
