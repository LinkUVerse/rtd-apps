# C114 全部内部 NFT 最终字节与重新授权矩阵

2026-10-08。承接P113-6及原TX-01／TX-04完整合同；不是重新定义父项。原C113八工具、21源检查／13准入反例、六真实拒绝以及当前C109产品与原全部开放父保持。原98仍89完成、剩余9.18%、trial_ready=false；准备资格不计业务。当前发布器工作，不停止原父／child或两组RTD／indexer。

## 官方结论及当前源码约束

Sui[官方赞助说明](https://docs.sui.io/develop/transaction-payment/sponsor-txn)明确sender、GasData及expiration属于完整TransactionData，sender与sponsor都必须对完整相同字节签名。[官方v2 transaction.proto](https://github.com/MystenLabs/sui-apis/blob/main/proto/sui/rpc/v2/transaction.proto)将epoch上界与ValidDuring的epoch／时间界限分别表达。对照当前RTD transaction-reader.ts：明确的GasData与expiration不能被解析器悄悄替换，simulate先验证sender和规范完整BCS，再使用checks=ENABLED；nft-transfer-preparation.ts对原prepared.bytesBase64进行最终模拟并比较原digest，不重新构建。不能把Sui main新增枚举当作本地RTD实际支持，实际支持按当前固定源码及当前gRPC／BCS返回核对。

## 必须保留的完整范围

四路direct、framework-kiosk、personal-kiosk、originbyte-kiosk分别使用原C93四个可转出对象；原C93共13对象、原C95 serial95形成当前14对象，四owner、全部cap／owner-token／policy和原六笔成功转移保护。当前C109 1122／a012d687及build01／实际Origin、C113独立网关归属和fresh300秒／完整696489七门成立后，才能读夹具私钥、创建测试profile及启动实际UI。不能用native oracle代替Kiosk索引发现或将直接NFT证据扩成全部四路。

OriginByte两种真实接收方ABI均需保留：已有目标Kiosk的p2p_transfer把接收关系放在共享对象引用中，没有recipient纯地址；新目标的p2p_transfer_and_create_target_kiosk才包含纯地址。驱动不能假定全部NFT的收款人位于inputs[1]，应按规范实际命令／引用审核，现有／新目标均用正常重新预览验证改变收款人的新完整kind。既有C48六批准字节可用于受控参数工具资格，原14对象在本轮业务中仍只读保护。

每路真实内部预览核对input／sender／recipient／route、完整BCS、GasData、expiration、digest、十依赖同S、规范最终effects及真实gas选择。基于现有精确source-map/CDP工具另存NFT参数工具，完整保留原loaded bundle／map／source／实际断点位置／唯一克隆参数／恢复与清理合同。仅克隆送入原生产revalidateNftTransfer的字节，原可见approval、旧digest、requestId、journal和密文不能被写入或改造；不替换生产函数、模拟回复或协调器状态。

逐路完整矩阵至少包含GasBudget+1000、GasPrice、recipient、sender、sponsor owner与fresh sponsor coin、expiration None及expired Epoch0。每个变更必须证明完整BCS只变化被声明字段且digest改变；sender错误应在网络前拒绝，其他按真实规范返回或完整非零grpc-status／详情headers核对，不能将未保存的错误body称通过。原bytes、gas数据、expiration和input保持；原旧grant不能授权变更；正常Back／新Review产生新requestId。每个case均不得执行Execute或签名；expired／unsupported timestamp或损坏BCS要真实UI拒绝，超大epoch按原字符串完整显示，不能舍入。

正向赞助及有效期须独立覆盖：全部四路实际production preparation与checks=ENABLED最终模拟，完整sender／gasOwner／支付版本／expiry和两端同byte签名，真实过期失败及两签对变化的拒绝；当前Wallet Standard执行边界需同来源完整证据。C95已有唯一真实外部执行及canonical effects保留，禁止为补证重发原6NFT或serial95。任何本轮正向签名或执行需先形成唯一归属／dispatch合同，不凭工具准备发起。API准备／本地签名不能代替原UI审批或真实赞助执行。

独立审核逐完整原请求／正文／trailer或实际错误headers核对最终BCS与effects、gas选择与原共享输入、Move调用及借还cap顺序、ownership输出、所有模拟阶段／次数和取消／零Execute；当前原source／八debug／1456文件／29容器14健康25actor／两链indexer／工作publisher保持。新自有profile正常锁定关闭，网关结束后确切正常清理。完整当前币／质押／赎回、dApp／内部NFT／赞助／expiration入口汇总与原TX-04 M5成立后才能收口TX-01／TX-04，并按原fine合同计进度。

## 子任务

P114-1：官方结论与当前源码对齐、原驱动／source-map工具／当前来源和原文档封存。
P114-2：NFT source-map参数工具完整旧源逆变换；实际当前production map唯一定位与克隆变化合同资格，不启动profile。
P114-3：完整四路内部UI／gas／expiry／sender／sponsor／recipient矩阵及逐全帧审核驱动；完整旧合同保留，真实七门前拒绝。
P114-4：全部四路正向预览和重新授权真实UI矩阵及逐完整原帧独立审核。
P114-5：全部四路赞助／expiry生产API及同完整byte签名／当前Wallet Standard执行边界完整实证；原成功交易不重发。
P114-6：全部当前入口最终汇总及TX-04全M5，按原TX-01／TX-04完整合同审计。
P114-7：精确自有清理、全原scope／限定实际交付和原fine计量，继续剩余全部父项。
