# C42 直接 NFT 完整表单真实锁竞争

TX-04 M3限定直接分支；84/98，其他NFT及durable矩阵保持。最新333000 finite审计03共同窗口已恢复306960–309815，可以读取原direct198775的现存受控收款对象；原交易与历史profile不重发、不打开。

- [x] L1：fresh有限环境/H0/最新debug与当前C42源码、原NFT canonical owner/版本/摘要和全部生产资产依赖；新独立profile正常导入原受控收款owner。先打开真实NFT完整表单、输入受控recipient、Review已ready，再启动同scope真实Wallet Standard只签名锁。
- [x] L2：私下延迟原真实signData结果；原native Web Lock不可用，点击已经打开的原NFT Review得到明确准备拒绝，草稿/会话/完整journal保持，零竞争正式模拟/签名/Execute。不以恢复守卫替代完整表单。
- [x] L3：原结果实际延迟至少31秒后失败关闭，锁和原signer恢复。原表单正常Review取得正式kind费用选择/final模拟、规范direct NFT摘要/bytes/sender/gas/Validity/recipient；正常Back及relock，零转移。
- [x] L4：当前worker/UI/source、全原HTTP帧、两原sign-only模拟/两NFT模拟、真实锁/31秒/草稿/journal独立审计；fresh canonical对象/gas/typed窗口及自然Chrome关闭。任何失败保留，部分分支不计父项。

原C41只证明旧恢复入口竞争；当前C42改变了转移表单生命周期，必须实测当前完整表单。原stake332734仍等待，不因本分支成功预勾TX-04/TX-08。

## 当前实际结果

[Chrome02](./20261007-C42-direct-NFT-full-form-lock-chrome-02.json)与[独立05](./20261007-C42-direct-NFT-full-form-lock-independent-05.json)完成限定L1–L4：32实际检查、四完整正式模拟、442个已采集响应（275 GraphQL、167 RPC）全部HTTP200，35个实际S摘要逐项fresh canonical核验。两窗口native锁实际不可用，已经打开的原NFT完整表单Review明确execution-lock拒绝并保留recipient，原私有signData实际完成一次；31秒后原结果因准入失效关闭，不向dApp返回签名。释放后正常原表单Review取得精确direct NFT费用选择和最终字节、Back/relock、三store不变，测试Chrome自然退出，0 Execute。

原签名释放后产品正常调用一次原生VerifySignature，其message.name=TransactionData、bytes/owner及本地验签均对应原只签名批准；不属于竞争签名或执行。审核不禁止这一合法校验，也不把它计为签名返回。独立原帧循环按实际路径分别解码归档gRPC-Web与/account/graphql。

14个原读取body采集失败完整保留：8个GraphQL状态为6次504/2次503，另6个GetObject是收件地址的headers-only NOT_FOUND（status5）。未把这些响应体补造为原帧，allOriginalHttpResponseBodiesCaptured=false；四个关键模拟响应均完整捕获。这仅完成当前直接分支的真实表单竞争，不证明持续可用、实际转移、其他Kiosk或完整父项。

Chrome01因读准入临时失效导致原Review禁用而失败，2次原模拟、0 Execute；未进入准备调用，不计L2通过，保留原输出与自然关闭。独立01–04保留失败：原工具错把archive当JSON、错识别/account/graphql、误拒绝合法VerifySignature及误读message.value；各修正版另存，05才接受上述限定证据。未修改产品响应、准入、源RTD/debug、原执行或pending profile。
