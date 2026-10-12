# TX-02 后台密钥、Intent 与批准摘要逐项核验

## 原项范围

Task TX-02：保持 background 私钥与 Intent，签名 bytes 和预计算 digest 一致。该项为签名编码合同，不替代 TX-01 完整授权、TX-04/05/06/07 持久提交／恢复或 TRY 的真实 Chrome 验收。

## 逐项证据

| 要求 | 当前源码及验证 |
|---|---|
| 签名密钥留在后台 | ImportedAccount/MnemonicAccount 只从后台 ephemeral storage 取 keypair；signData 调用 Account.generateSignature。实际两类账户的 toUISerialized 测试证明返回公钥／地址，不返回 keyPair 或 encrypted。用户主动导出备份功能不在签名响应范围，未删除。 |
| 原始 UI 签名旁路关闭 | BackgroundClient 与 MethodPayload 无通用 signData 请求，accounts handler 在 DB 访问前拒绝旧消息；raw-signing-rejected 3项。四入口上轮构建静态审计已通过；本轮无生产代码修改。 |
| TransactionData Intent | coordinator 和 dApp sign-only 用 messageWithIntent(TransactionData, approved.bytes)；Account.generateSignature 对该内容 Blake2b-256 后按原scheme签名。实际两类账户×三种scheme与SDK signTransaction 的输出逐字一致。 |
| PersonalMessage Intent | 后台对消息先BCS vector<u8>，再加PersonalMessage Intent；两类账户×三种scheme与SDK signPersonalMessage输出一致，跨交易Intent验签拒绝。 |
| 摘要来自最终bytes | approvedTransaction 使用 TransactionDataBuilder.getDigestFromBytes；coordinator 在任何签名／网络前拒绝批准digest不一致。新账户测试重算同bytes摘要，并确认修改gas预算后的bytes不能验证旧签名。 |
| signer／bytes核验 | execution-reader 向身份受检 Fullnode VerifySignature 提交批准bytes、TransactionData和授权address；已有真实gRPC wire测试覆盖请求字段；coordinator测试错误bytes签名不能写pending。此前真实开发链提交证明普通测试密钥签名被当前Fullnode接受，但并非真实浏览器账户存储测试。 |
| 锁定和兼容 | 两类账户无解锁ephemeral key时均拒绝；from-exported-keypair验证三种当前scheme保持地址，并保留显式legacy导入兼容。Qredo／zkLogin仍按已有范围禁用本地签名。 |

## 官方对标

重新读取固定官方提交 `3c32c302625c7d4c63cd89597c34b86bcccdbcea` 的 [keypair.ts](https://raw.githubusercontent.com/MystenLabs/ts-sdks/3c32c302625c7d4c63cd89597c34b86bcccdbcea/packages/sui/src/cryptography/keypair.ts)：signWithIntent 加Intent后 Blake2b-256，再按scheme编码签名；signTransaction与PersonalMessage分别使用不同scope，PersonalMessage先序列化字节向量。本地rtd-typescript相应实现与当前钱包路径一致。官方旧docs签名URL本轮404，未用失败页面作证据，也未依赖第三方镜像。

## 验证与边界

新增 signing-intent.test.ts 16项实际账户／密码学测试；存储服务以隔离fixture替代，没有读取用户账户或私钥，没有广播交易。连同真实gRPC格式reader、协调器、后台授权、个人消息、旧消息拒绝和导入兼容，8文件121测试通过（20261004-TX-02-tests.log）。钱包完整TypeScript检查通过（20261004-TX-02-typecheck.log）。不冒充原生Chrome、真实IndexedDB解锁或用户助记词派生验收。

TX-02的编码合同及上述规定验证已完成，Task单独勾选；TX-01/04–12、TRY与QA继续保留原范围。总体34/98，trial_ready=false。
