# C133当前非NFT自然pending与冷启动限定验收

当前生产来源为C131，完整1122文件SHA `eaa3bb1d56ba8ac23323127ec92e853530cee304dde8fb8846fb3d0670ae70f1`。实际worker、主UI及dApp popup加载字节、C132查询origin、原完整运行归属和最新八debug原产物均独立核对。只使用C132正常导入dev账户的独立受控profile，不打开原钱包；本批不修改产品代码、不操作NFT。

## 一次正常批准产生的真实pending

[creator02](./20261009-C133-current-non-nft-pending-creator-02.json)实际通过261完整HTTP响应、两次ENABLED模拟、一次原生VerifySignature、一个正常钱包签名和唯一一次已签Execute请求。请求在转发前截断，未到达链节点；自然生成dispatch-pending并完整保存三journal与原密文。固定摘要为 `B9eGdYhsB3gMAEZbwCbk7vAosHgzbCmuxvh3zGBCAzRU`，前后原生NotFound、业务Coin与原C43仓位保持。[独立02](./20261009-C133-current-non-nft-pending-creator-independent-02.json)逐规范BCS、实际签名、模拟/验签同bytes与全部store核对，并拒绝10个篡改反例。

creator01在批准前因引用旧profile密文基线而失败，0签名/Execute，保持原失败；v2使用实际C132密文基线。已批准creator02从未重跑，没有种入、删除或重写journal，没有重新签名或发送交易。签名私有函数调用次数没有直接观测，因此不冒充完整M5计数。

## 同profile冷启动的实际四入口

[cold03](./20261009-C133-current-non-nft-pending-cold-03.json)正常解锁现有受控账户，进入普通Coin、质押及原C43 OwnedStake赎回三个正确业务路由。Coin实际填写1nano和本人地址，真实wallet-transfer-preparation query返回“当前链账户有待确认交易，请先恢复原交易”，没有prepared data，“检查”保持禁用。质押/赎回未产生新的可用授权。真实Wallet Standard新请求的Approve禁用；正常卸载恢复observer并确认原生Web Lock实际ifAvailable空闲后，trusted dApp preparation仍返回明确durable错误，排除了仅靠活跃observer锁阻止操作的解释。

正常Reject、Disconnect与relock均完成，原三journal、账户密文、原摘要和当前加载来源保持。0新模拟、原生验签、签名、Execute、faucet、旧JSON-RPC或公网Sui业务请求。[独立03](./20261009-C133-current-non-nft-pending-cold-independent-03.json)核对三个真实资产上下文、正确旧仓位、填写后的明确query错误、真实dApp输入、全部journal/密文及当前UI-worker-popup，拒绝24个篡改反例。

冷轮完整留存206响应。另有13次固定摘要GetTransaction NotFound及1次确切收款地址对象提示GetObject（本人地址/固定九项mask、实际Coin阶段）的正文不能由浏览器捕获；仅保存原请求、H0/状态及grpc-status=5，原因未确认。此提示来自当前recipient-hooks的对象存在性检查，不用于签名授权。其他对象、stage、URL、成功状态或模拟/验签/Execute响应不得沿用此例外。`allOriginalHttpBodiesCaptured=false`，teardown采集也未通过；不将不可捕获正文当作完整原帧。

cold01以“Review按钮必须不存在”而停止；cold02实际已走完四入口，但旧采集规则只接受固定摘要NotFound，因上述收款提示空响应失败。两次失败全部保留。后续仅改独立测试/审核的窄范围采集规则、证据保存和有效填表要求，完整源码逆变换01–07均封存，没有修改产品以迁就断言。

## 计量及后续

P133-1/2完成；P133-3a仅接受实际四入口durable行为与store/source保持。完整采集、live竞争、全部签名调用计数与非NFTM5继续，P133-3、P129-6、P132-4等完整条件仍开放。原89/98、细分剩余9.18%、trial_ready=false；不改变原权重或把NFT延期算通过。普通Chrome初始化/当前构建升级/TLS权限、名称757805正式窗口、完整物理/WAL冷恢复和所有一期联验仍需完成，NFT业务专项在一期全部验收后继续。

两个不同H0的原RTD/indexer及六恢复中间件继续用于明确的当前链/换代恢复任务。C132三自有查询/guard仅在当前必要测试期间使用，结束后按确切归属正常清理；0原服务信号、force、卷或镜像清理。
