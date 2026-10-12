# 移除遗留 UI 原始签名通道

## 缺口

当前页面已使用受控新命令，但 BackgroundClient 仍保留 public signData，MethodPayload 保留请求／响应，accountsHandleUIMessage 直接调用 account.signData。该遗留入口没有新批准凭据、pending 或执行 scope 锁校验，不能保留为迁移后的可达旁路。

## 变更

删除 UI 方法、无其它用途的 base64 import 和两项消息合同；后台账户 handler 在任何账户／DB读取前拒绝旧 signData 消息。内部 MnemonicAccount／ImportedAccount 的 signData 保留，用于 executeWalletPrepared、executeDappPrepared、signDappPrepared、signDappPersonalMessage 的受控授权路径。未改变密钥存储和新 Intent 编码。

新增实际 accounts handler 测试，旧消息有效base64／损坏base64／null均拒绝，数据库与响应函数不调用。定向覆盖新执行、dApp只签名、个人消息和协调器，共5文件62测试通过，见20261004-raw-signing-tests.log。初次类型检查缺少 ErrorPayload 的 type 字段保护，已补 'type' in payload；最终完整钱包类型检查通过，见20261004-raw-signing-typecheck-final.log，初失败日志保留。

静态审计增加源码和四个生成图中的 raw signData 消息检查。动态构造消息与真实扩展跨 worker 仍需单独验收；这不等同 TX／TRY 全项完成。双方交易合同同步更新，总体维持33/98。

最终全量钱包回归108文件1131测试通过（20261004-signing-full-regression.log）；开发扩展webpack构建通过（20261004-raw-signing-build.log），四入口静态审计通过且rawSigningMessages均为空（20261004-raw-signing-audit.json）。该全量包含此前APY、元数据错误、NFT属性和币种估值修复的当前工作树；不替代真实服务／Chrome验收。
