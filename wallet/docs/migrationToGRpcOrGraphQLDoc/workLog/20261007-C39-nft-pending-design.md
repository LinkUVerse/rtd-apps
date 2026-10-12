# C39 NFT 在严格 pending 下的真实页面守卫

沿用 TX-04 的 M3 既有任务。原 C39 产品生成的 dispatch-pending 只有一次被浏览器截断的 Execute，未转发；原三 store 与密文保持。不得删除该记录、重新批准或构造替代 pending。

- [x] N1：只冷开原 pending profile，正常解锁，原 journal／密文、C39 UI／worker 字节核验，Native Web Lock 实际可用。
- [x] N2：依次打开原直接 NFT、PersonalKiosk NFT 与 OriginByte NFT 的真实转移入口；准入 S 必须仍在其真实转出前，确认快照在 S 的持有关系，不将旧快照误作当前 Fullnode 所有权。三入口均只恢复原 pending digest、禁止新的检查／批准。
- [x] N3：全部三 store 不变、0新模拟／签名／Execute、原账户重锁；独立结果核对。不能以本三分支代替尚无非空夹具的 framework Kiosk 分支或完整 live-lock／取消矩阵。

测试只证明 pending 在资产快照与准备动作之间的守卫；上述三件 NFT 的已发生真实转移保留，不重发，不尝试新鲜对象准备。索引若已经追上其转出 checkpoint，本轮前置不成立，保持未验收并保留结果。

[实际Chrome01](./20261007-C39-nft-retained-pending-chrome-01.json)14检查通过；三入口均在实际准入S97152，早于真实转出168886／177615／176999。原NFT准备组件显示唯一pending摘要、检查禁用／无新批准按钮，九次回执查询只查原never-forwarded摘要；完整三store／密文保持并重锁，0模拟／签名／Execute。[独立审核01](./20261007-C39-nft-retained-pending-independent-audit-01.json)逐项实际assetSnapshot cacheKey／readSession／S、UI／worker原字节、原严格pending谱系及完整store核对通过。当前Fullnode中的三NFT已经转出，本项只证明在准入历史快照下仍无法越过pending，不声称现在仍持有。framework非空准备按[独立清单](./20261007-framework-nonempty-fixture-design.md)继续；完整M3及父任务保持开放。
