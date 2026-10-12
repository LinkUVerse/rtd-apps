# C179 测试 dApp 长 URL 原因与完整数据交付

C164两轮都在personal原始窗口、27项之后失败，第二轮延长60秒及检查正常解锁仍失败；钱包实际未锁，三个私有签名入口0。只读检查发现 src/background/dapp-native-context.ts 原生sender URL上限4096字节。测试把完整JSON作为URL参数：direct1948、framework约3148、personal4316 base64字节，再加origin/query使Personal越界。钱包正确拒绝，不降低原生来源校验，也不改生产代码。

新静态dApp改用authorizationFile=authorization-NN.json，页面URL短于4096；完整交易JSON以普通同源HTTP GET读取，SDK Transaction.from正常重建后走原Wallet Standard接口。54有效期数据文件或四路36变体全部不可变落盘/固定SHA，全部实际使用的JSON回复原实体/规范bytes/参数/请求逐个关联，禁止凭空注入页面或重写RPC返回。原数据字节没有截断，原生URL与源身份限制保持。

C164第三轮仍完整54、24正向/6过期/24不支持timestamp，0签名，正常Reject/Disconnect。C167仍四路16唯一sender批准/16同byte sponsor签名/160变更原签拒绝、四单签执行拒绝、40模拟/16原生Verify，原一签审批记录WX防重复保持。两demo均由当前源构建，55完整source-map与3静态产物已资格检查；新数据HTTP纳入全采集/独立审核。

旧两轮failed留存，不合成通过。必须新完整实测、原实体/实际终态/三私有入口/三store/密文独立通过，才计入TX-01。原C95唯一外部执行不重播。
