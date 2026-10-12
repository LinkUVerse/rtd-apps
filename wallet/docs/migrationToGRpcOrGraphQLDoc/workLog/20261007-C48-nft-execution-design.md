# C48 六条 NFT 首次真实转移及写后验证

R48-1：以当前 C46 编译产物和七覆盖424677／八件原库存独立证明为前置，只启动全新C48自有临时gateway；原两debug链、29服务／14health及1015私有文件严格保持。

R48-2：新建未使用的专用profile导入原非空夹具source，仅首次发送direct、普通framework、普通挂牌、Personal、OB已有target、OB新建target六个不同NFT。已有注资／合约部署／播种不重跑；所有旧profile不打开。每次实际Review字节、digest／sender／recipient／GasData／expiration先写入fsync封存，再实际点Send一次。网络出口只允许封存bytes和sender、最多一个Execute请求，签名经原生VerifySignature验证；不可重签、重发。前一条journal为terminal成功且无pending才允许下一条。未知提交立即停止后续测试，只允许读取同digest恢复；不清pending、不构造替代交易。

R48-3：独立解码原Verify／Execute／所有正式模拟protobuf与规范交易及effects，核对六个真实receipt和journal、原生NFT转移／cap与Kiosk变化、同H0／generation，以及新的执行checkpoint后的七覆盖及同S生产查询。旧八件未变证据只代表历史前置，不在写后重跑或伪称仍相等。索引尚未覆盖时保持开放，不降最低检查点／S+20门。

R48-4：正常重锁关闭自有浏览器，保留完整journal／cipher／抓包及失败结果；仅清理本轮已不用的临时容器，累计51，原服务与未知退出容器保持。父项98是否完成仍按完整合同独立审核。

本次属于用户已授权的dev迁移核心链路测试；0额外faucet／deploy／seed／CA变更。签名和Execute只用于上述六个已归属测试夹具的NFT，不扩大到用户账户或旧待确认交易。
