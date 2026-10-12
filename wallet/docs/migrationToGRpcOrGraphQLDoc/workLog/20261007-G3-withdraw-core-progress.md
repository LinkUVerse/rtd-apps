# 新链仓位的当前生产赎回核心补证

按[W1–W4子清单](./20261007-G3-withdraw-core-design.md)实际完成当前C42生产fresh reader／transaction reader与prepareStaking／revalidateStaking核心校验。

[实测01](./20261007-G3-current-withdraw-core-01.json)43个真实G3 Fullnode完整请求／响应，四ENABLED模拟，原332734仓位1e9本金／当前系统V2／余额核对；kind费用选择、final bytes正式模拟和原bytes重新模拟成功。Gas预算从2000000增加到2001000的真实最终交易正式模拟成功，但旧reviewed digest在revalidateStaking中明确拒绝；changed摘要与原摘要不同。错误owner／真实coin类型／binding拒绝，分别0新增模拟。原仓位和余额初末保持，没有读取私钥、签名、Execute或启动Chrome。

[独立01](./20261007-G3-current-withdraw-core-independent-01.json)离线核验全部43完整gRPC-Web请求／响应与grpc-status=0、canonical object Object::摘要和effects BCS／TransactionEffects::摘要、精确withdraw Move调用／shared和owned references／链绑定Validity、fee选择和三个final模拟（原prepare／原revalidate／改Gas）。实际Gas变化只有1000 MIST，其余canonical data逐字段相同；原摘要确实在新字节实际模拟后被拒绝，负例和原stake／余额保持成立。

此结果只完成当前生产Node readers的核心补证；组合中未使用浏览器Provider的preparation guard、journal和Web Lock，不能认证当前C42 UI实际Gas修改／批准、赎回表单竞争或原仓位indexed准入。未发生赎回／本金奖励支付。S>=332734、当前C42完整表单／Back／重锁及全部父项继续；84/98，14开放，trial_ready=false。

原G4 controller42450/session50926在5762秒HBase最低282776、SQL／Rocks283000，indexer实际自然0，writer／consistent仍运行。不重跑该操作；等待实际完整终态和明确原命令恢复之后再注册C42。独立核验不修改任何运行cache／watermark／journal或源/debug。
