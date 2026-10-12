# C129本批新pending stake赎回实施约束

原[总合同](./20261009-C129-direct-owned-query-network-design.md)继续；stake已[独立验收](./20261009-C129-sponsored-stake-execution-independent-01.json)，本批新仓位0x15086509841a6a386d5cebd033d37a887c49caa4c691650476e71107a1f1e3ea本金1000000000/activationEpoch3。仅将C126历史withdraw/None完整模板的原stock输入和GasCoin引用替换为最新本批new stake与另一枚未消耗sponsor Coin，其他bytes均唯一可逆；旧签名不复用，禁止原C43仓位参与交易。

实施前原生最新GetEpoch/active validator pool、完整new stake BCs及其父Execute/Effects独立pin全部核对。只在新stake.activationEpoch>当前epoch且pool已经active、没有deactivation时走已核对Sui/RTD的pending本金原样返回；若epoch/pool/覆盖门不成立，则拒绝并保留，不能降低窗口或伪造接口。sender/gas原生引用及原stock保护仍保持。

复用本批受控CFT profile正常解锁/Connect/新sign-only Approve，原90秒等待/30秒租约、未插桩UI/worker/popup加载源、两完整ENABLED模拟/一次原生Verify/一返回sender签名、normal Disconnect/relock、完整三journal及账户密文保持。全部关键签名/模拟/批准原帧必须完整；如已知启动GetServiceInfo旁路正文不可捕获，单独保留实际URL/阶段/错误/状态及缺帧数，不计为已捕获或已验证，也不将fullUiCaptureAccepted记true；其他/关键缺帧仍拒绝。完整当前链身份由独立真实native返回核验，失败原因不臆测。这个限定授权合同不代替全UI响应采集、普通Chrome或全一期验收。

发送方授权独立核对后才新增一sponsor签名/双方同bytes原生验签；独占fsync pending/dispatch-intent后仅一Execute，只固定digest查询确认。所有规范Effects及ObjectWrite/删除new stake/返回新Coin UID-owner-balance和sender总余额+1000000000、sponsor实际gas扣减、原C43完整字节保持独立证明；禁止把全Coin三对象断言用于System/dynamic对象。保留全部首次失败，Task按实证P129-5限定更新，M5和其他一期继续，结束后清理确切三query与guard。原98/89和fine权重不改，NFT业务专项继续第二阶段。
