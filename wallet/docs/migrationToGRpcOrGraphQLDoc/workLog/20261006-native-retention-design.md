# 原生保留窗口推进与身份Fault分类：编码前合同

65/98，trial_ready=false。第3轮审核候选资金测试的两笔V2 Faucet各到账1000000000000原子单位／5 coins；签名被Fullnode identity/incompatible拒绝，0模拟／Execute，未知签名数保留not-counted。加密副本236文件SHA与原失败profile保持，副本worker新UI启动前只读见一个身份Fault、无pending。它是结束后的状态，具体失败时的字段尚未保存，不据此断言该次成因。

后续Node三组原生／Move／发布探测全通过；新的无账户Chrome NC5页面8个实际GetServiceInfo均同H0、height923917、lower197815，原观察已收尾且无Fault。此前只读服务lower197539，之后197654和197815，证明此链正在正常前进裁剪范围，但没有证明第三轮签名时具体bookend值。

## 权威结论与本地策略

固定上游[Sui GetServiceInfo实现](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-rpc-api/src/grpc/v2/ledger_service/get_service_info.rs)从当前检查点及reader保留范围生成返回值；[reader](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-rpc-api/src/reader.rs)取两存储下界的较大值作为可完整返回的下界。旧objects字段已被上游注明弃用，目前同样返回该下界。本地rtd对应实现一致。[官方Fullnode说明](https://docs.sui.io/operators/full-node/sui-full-node)明确裁剪窗口及旧数据NotFound后改查归档。[原文与SHA](./20261006-native-retention-official-source.json)已保存。

推论：同H0且各字段本身合法、height没有倒退时，下界前进仅说明本次查询的保留窗口改变，不单独证明错链或身份schema不兼容。上游未定义钱包Fault持久策略；以下是按迁移安全要求作出的本地分类。现有三个末检把任一下界不等直接抛NetworkIdentityError，能把正常裁剪永久隔离，应改为有限读取失效。

## 编码顺序与守卫

1. 先用SDK协议夹具重现：同H0、合法字段、native读取前后下界由0推进到1，当前会留下永久身份Fault；另带已知coins ABI Fault时必须保留原Fault。保存RED证据，不使用成功覆盖失败。
2. 在identity模块定义独立的窗口推进错误／统一末检：H0及字段合法性仍由原info校验；height或下界倒退继续身份不兼容；仅合法向前推进抛ABORTED窗口变化错误。不能发表该组本次正面报告，也不生成身份Fault。
3. native角色降级为明确changed，Move／发布聚合降级为partial；原拥有者正常完成或实际raw终止后收尾。所有错H0、畸形字段、退回水位、schema／ABI Fault、别人pending和未知旧记录仍保留；不清旧Fault或靠重试正面结果解锁。
4. 定向覆盖三个末检、NC5普通与已知Fault、迟到错链／物理cleanup，再完整类型／测试／独立生产构建，保存C19源码与产物，产生新C20证据。真实账户／资金后续只用全新profile，不重复注资失败03或打开原profile。
5. 当前父65保持；只有新产物真实链路与对应父合同完成才再勾父。第三轮失败具体因果仍不预设为已解决。
