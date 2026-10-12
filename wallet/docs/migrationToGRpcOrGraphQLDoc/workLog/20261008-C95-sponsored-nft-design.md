# C95 当前 Wallet Standard 赞助 NFT：双签收集与外部 gRPC 执行

实施前合同，2026-10-08。对应 TX-01 的实际赞助分支；98 父项仍84/98，全部内部 Kiosk、四路竞争、正式索引／普通Chrome／完整父验收继续。

按 [Sui官方赞助交易](https://docs.sui.io/develop/transaction-payment/sponsor-txn) 的 sender 在 Wallet Standard 批准同一完整 TransactionData、独立 sponsor 核对并签名、外部提交双签流程测试。钱包 execute 只收集单签，现有赞助拒绝不能移除；外部 Execute 不冒充钱包执行 coordinator、journal恢复或内部NFT页面。

- P95-1：八份当前文档原字节封存；C94完整交付、C93原1456保护文件／八NFT五cap＋原十三policy、当前C92 ownership／source八debug／29容器14健康25actors、当前C46生产36成员与完整demo源核验。
- P95-2：复用 C93 新独立 source／sponsor 的已完成一次fund余额，零Faucet；调用已部署 nonempty_kiosk::mint(serial95) 一次，NFT保留为专用赞助对象，不移动任何C93库存。完整最终模拟／签名、fsync pending 后仅一次 Execute；即时not found只能按原digest只读恢复，禁止重发／重新fund／新deploy。
- P95-3：新独立空 Chrome for Testing profile 正常导入该测试sender，随机密码留内存；固定当前生产 worker／UI bytes，实际 Wallet Standard sponsor／Epoch预览与sender批准、返回完整bytes摘要／signature验签。当前单签 execute UI禁用／拒绝和三journal store保持；新profile不打开原签名或C51普通Chrome敏感页，不改系统CA／权限／证书绕过。
- P95-4：独立 sponsor 对与实际钱包sender相同完整bytes签名并独立验签；修改 Gas／expiration 的bytes必须拒绝两旧签名。复验新NFT／fresh sponsor gas ref及批准bytes的ENABLED模拟；fsync独立pending后一次外部原生gRPC双签Execute，原digest只读终态／typed BCS／effects／新owner／sender余额不变与sponsor实际gas支出核验。外部未知结果不自动重发。
- P95-5：完整原始protobuf请求／成功body与trailer、全部失败headers、typed交易／effects／双签／gasDelta、27保护对象不变、实际UI和服务scope独立审核。正常重锁／admission settle／关闭新profile，临时demo listener清理、0 Docker或原服务信号；更新实际日志，完整父任务不预勾。

所有 stage 有独立一次性intent与私有0600证据。失败保留源和输出，新版本／只读recover不改历史。未通过P95-1不能运行mutation；赞助Execute前必须通过真实钱包批准，不能用本地sender签名代替。产品源1120 a03保持，不以native oracle代替正式asset快照；当前seven gates与原六NFT524022写后验收仍独立。
