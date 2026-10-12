# C114 六场景真实有效期 UI 驱动

2026-10-08。承接原 P114-3／4，不替代原四路赞助、全部入口和 M5，也不降低当前 696489 的完整七门。当前 C109 产品 1122 文件保持；新内容只在 scripts 测试工具中实现。编码前封存原当前内部驱动、正向审核器、有效期组件及原数据合同。

现有 authorization-fixture.ts 明确只接受 None／Epoch；不能将其页面侧拒绝算为 ValidDuring／Validity 钱包 UI 拒绝。新增独立静态测试 dApp，只使用当前 SDK 的 Transaction 和真实 Wallet Standard 注册、connect／signTransaction／disconnect；无 execute、签名伪造、回复注入或钱包函数替换。请求通过正常按钮产生，审批仅正常 Reject，不点击 Approve。

每个当前 direct、framework 普通／挂牌、Personal、OriginByte 已有／新目标使用已独立通过的当前内部批准完整 BCS，保持 sender、GasData、完整 kind／Move 引用及 NFT 身份，只变更 expiration。九种输入为原完整窗口、None、Epoch0、9007199254740993、原窗口 minTimestamp1／maxTimestamp u64 最大值、ValidDuring 无时间界限及其 minTimestamp1／maxTimestamp u64 最大值。原 Validity 的 allowedProposers 在该分支保持；转为 ValidDuring 明确移除该分支不支持的 proposer 字段，其余窗口字段完整保持。

每种输入由完整 BCS 规范往返、typed digest 和 SDK JSON→BCS 等值验证。真实页面要显示准确 digest／epoch／提议者，None 显示无有效期；超大 epoch 保留完整十进制字符串。时间约束模拟成功后必须在实际 TransactionValidity 中显示不支持，并禁用批准按钮；Epoch0必须记录真实 ENABLED 模拟错误的状态／消息／二进制详情和禁用批准，不能将缺失正文或模拟失败混为 UI 时间约束拒绝。每个请求正常 Reject 后没有签名结果，原 journal／密文、十四原生对象及 sponsor 不变。

驱动先执行 fresh300 秒／完整七门；不足时在私钥、目录、native、监听、浏览器及前序正向文件读取之前结束。正向再核对当前内部54故障矩阵及独立审核、相同当前产品／链／原生对象、网关完整归属。复用唯一启动钱包 UI，另外的 dApp 页面和逐请求审批 popup 必须精确记载。全部 HTTP 请求、正文／trailer及实际错误 headers 保留；禁止 Execute／VerifySignature／JSON-RPC／公共节点。最终原生只读复核、正常锁定、自有 Chrome 和静态服务器关闭，完整原运行 scope 保持。

工具资格使用历史六种原批准、离线 SDK、当前编译依赖及隔离 mock，仅证明工具合同和真实未覆盖 CLI 的零副作用拒绝；不证明当前 UI、NFT、赞助或父项业务通过。P114-3是否收口依据完整代码／逐帧审核和限定资格，不以文档或历史样本冒充实机；P114-4必须新完整覆盖后的真实54 UI 用例及独立原帧审核。
