# C275：新 dev 链的普通 Chrome 业务验收

## 环境与升级

本轮使用 C274 最新源码 debug 链及完整认证发布、HBase、SQL、consistent、GraphQL、Ledger、account 服务。通过 link-u-smart-contract 的 localDeploy 脚本创建与部署，保留旧环境、旧链数据及原 pending journal。

C275 生产编译和依赖闭包审核通过，产品源码与 C257 一致；新增经过完整证书前缀验证的新链合约发布配置，原 G3 配置条目保留。原路径安装前通过普通 Chrome 扩展管理页禁用准确扩展，安装保留完整 C257 构建，重新启用后原四个测试账户均可见。使用主人的持续授权自行升级、解锁，没有修改浏览器账户数据库，没有在文档记录密码。

新网络 H0 为 `BTrU3deMDbnWcUWLJ2ruDj9vbCC4gaYnVj8qV3K2nFah`，generation 为 `dev-20261011-04`；Fullnode 43150，GraphQL HTTPS 43210，archive HTTPS 43203，account HTTPS 43211。普通 Chrome 的 fullnode/graphql/archive 预检通过并保存切换。原 0x3270 账户旧链的 149.99 M 余额切换为新链实际 100 RTD，新链的两个 Display NFT 正常展示。复用本测试 profile 已信任的开发 CA，未修改系统信任。

构建与安装证据：

- [生产构建](./20261011-default-generation-positive-C275-build-01.json)
- [生产依赖审核](./20261011-default-generation-positive-C275-closure-01.json)
- [原路径安装与原构建保留](./20261011-C275-ordinary-upgrade-installed-01.json)
- [新环境四角色真实读取](./20261011-C274-four-public-roles-01.json)

## NFT 一次实际转移

从普通 Chrome 的资产卡片、详情和发送表单进入，核对预览后点击一次最终发送。NFT `0x07d5ee08bf95bd25dd0b9e1918b8dfb056c18f10ee80c49192f326c0659519c3` 从 `0x32707d815917729a49dc103a1b511f297de389b19600611fcc1a5cdb8b91dcb7` 转给已授权的 `0xbad0f77037d2352d281607a6237bf559180c85228baf91b7144a5fa021f20456`。

原摘要 `BcNZtuXwwK4XBkpBtA1iri5ZLVbVCR2AjYmodcrWPjjE`，checkpoint 2474，NFT 写后版本 42112。普通 Chrome 显示交易成功、收件人 0xbad0…0456、实际 Gas 0.001028728 RTD。预算 2018848 MIST，有效 epoch 13–14。见[派发前意图](./20261011-C275-nft-intent-01.json)。

初次写后索引仍低于 2474，生产 reader 正确拒绝满足不了的 minimumCheckpoint；发送方旧资产暂时保留。没有重复提交。发布推进到 2566 后，[独立完整检查](./20261011-C275-nft-indexed-01.json)通过：原摘要、原 BCS、离线签名、唯一 TransferObjects 命令、收件人、Gas 上限、限定 H0、链上所有权与双方同一索引快照逐项一致；发送方不存在该对象，接收方持有相同版本和摘要。

本次执行时 DevTools 已关闭，未将后续 HAR 冒充执行请求的完整捕获；执行成立依据是普通 Chrome 预览和成功收据，加独立原摘要、原字节和签名核验。三入口全部流量汇总 REL-02.12 继续单独验收。

23:14 完成双方普通 Chrome 重载：接收方 0xbad0 页面重载后仍显示该 Migration Display V2；切回发送方 0x3270 重载后仅剩 `0xa89d…8e01`，转出的 `0x07d5…19c3` 已移除。[真实 HAR 审核](./20261011-C275-nft-browser-audit-01.json)覆盖132条请求，其中6份完整写后所有权列表；接收方2497/2563/2566、发送方2597/2631快照均高于执行2474，版本、摘要、previousTransaction与原生证据相符。2个取消请求单独保留，不算成功。没有JSON-RPC或非本机服务访问。

据此 REL-02.10“NFT转移双方写后索引及页面刷新”在主人允许的新 dev 验收环境完成，剩余0%。本次完成的是新链直接持有NFT的真实闭环；旧 G3 OriginByte 原交易 checkpoint 2001906 的历史索引状态没有被改写为已追平，原成功与旧缺口证据继续保留。其他 NFT 路由的既有分项证据与完整功能覆盖仍由 REL-02.12／REL-05 联合审核。

## 仍需推进

名称解析仍因全节点新鲜度与发布索引延迟拒绝，未放宽校验。发布器每批重新审核完整已提交前缀；本轮 2466 个对象的审核观测耗时 72 秒，不能将这个观测等同于所有延迟的根因或已经完成优化。质押赎回、完整冷启动和完整换代矩阵继续开放。

## 质押推进（未收口）

23:21 同一普通 Chrome 的 0x3270 账户向新链 validator-0 质押 1 RTD，原摘要 `4qW1kBDLzpnwiRug2P4T1hRi9KGuPitLaE2zgQYkHZSm`，checkpoint 3181。新 StakedRtd 为 `0xb4de6e5fb67b5cb5f9f919afadcc0e3fa1008a0b167514af4d57618e6bd5ca45`。Gas 15024280 原子单位，账户扣减1015024280，首页实际显示98.98 RTD；收据提示奖励开始17轮、可领取18轮。

[一次执行审核](./20261011-C275-stake-audit-01.json)核验实际模拟字节、签名、唯一ExecuteTransaction、SplitCoins金额、唯一request_add_stake调用、验证者、限定H0/15–16有效轮次和原摘要确认。627条捕获记录涵盖较长的页面操作及后台刷新，不是一次刷新请求数；64条例外保留，包括4条GraphQL503，不算读取成功。此次记录包含先前NFT写后读取，不能与NFT HAR统计简单相加。

当前生产质押reader两轮独立真实读取通过：11请求约14.0秒／16.8秒，第二轮索引epoch16。页面曾因背景查询错误临时显示同步失败，之后实际预览成功；不能因此宣称质押服务持续稳定，也未直接改大20秒预算。新仓位写后展示、赎回及余额／历史闭环待完成，REL-02.11仍开放。
