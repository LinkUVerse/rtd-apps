# C143 非NFT冷测试的直接调用与原始正文观测

一期非NFT继续优先。C138旧creator/全部已签摘要/原profile/旧失败不重建、不签名或发送。本批先制作直接私有方法入口观察器，并以独立空测试环境核验工具；不是原pending冷验收。

直接签名观察器绑定当前C136完整background.js和source map，并把ImportedAccount、MnemonicAccount、ZkLoginAccount实际signData第一条语句定位回当前TS来源。仅在实际可断点位置登记条件计数：只增加随机命名的临时内存计数，条件返回false，不暂停、不改函数、参数、结果或compiled source。每次读取验证同一worker目标、source SHA、全部三个位置、计数状态与单调性；丢失目标、来源或计数则失败，不返回伪零。关闭时移除本工具断点及内存观察状态。缺少观测仍是null。

Chrome官方[Debugger协议源码](https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/pdl/js_protocol.pdl)规定条件只有为true才暂停，返回实际断点位置。本工具还要实际检验位置、false条件不暂停和一次异步调用计数，不以文档替代运行证据。不使用getBestEffortCoverage推断未调用，也不把入口未调用当成全部钱包流量已经通过。

真实正文采集后续采用实际route.fetch读取完整原上游响应之后原样fulfill，明确禁止自动重试、重定向和模拟/验签/执行/旧RPC。原上游帧与实际浏览器交付分别记账，交付中止不伪造成功帧。未知正向GraphQL正文必须被完整保存，不扩大C133错误白名单。全部采集及直接方法入口计数真实成立后，才可接受非NFT冷M5。

空测试环境只使用既有官方Chrome for Testing和当前C136产物，不导入账户，不打开原profile；网络全部拒绝，浏览器进程仅属本测试并正常关闭，数据留存。所有原RTD/indexer、C139回放、C141认证和Docker保持。全709570证书/实际查询新归属/七门仍是后续冷测试前置。
