# 新鲜资金余额接入 Provider

在共享 WalletRpc 合同新增必需 readFreshBalance；实际 WalletRpcProvider 的 configured、initializing、未配置／无效三种分支均已接入。Fullnode会话有效时可独立读取，不以GraphQL资产准入替代新鲜资金查询；无会话时明确拒绝。

新增 useFreshBalance，规范owner和coinType，query key包含binding/readSession/owner/type；禁持久缓存和自动重试，即时过期，查询错误时不释放上一成功数据。

集成测试在真实Provider、React StrictMode、真实SDK gRPC编解码下使用受控服务响应，验证“全部资金来自addressBalance且无Coin对象”的结果保持大整数，切账户变零不沿用前账户余额，再进入错链会话拒绝旧资金。该项不是实际链addressBalance交易证明。加已有Fullnode余额与coin hook共3文件19项通过：[日志](./20261004-funding-provider-tests.log)。新增必需方法暴露一处测试fixture缺字段，已补为明确unused拒绝；完整钱包类型检查最终退出0：[日志](./20261004-funding-provider-typecheck-final.log)。

发送表单及prepareCoinTransfer尚未切换，不能说已支持addressBalance发送。当前SDK CoinWithBalance具备withdrawal与混合资金解析，但原“发送全部RTD”转移GasCoin的实现需要结合addressBalance gas预留重新处理，且需继续满足ValidDuring／Validity重放保护。下一步应一次接通普通金额、混合资金、原生发送全部与最终模拟／批准绑定，不以展示新余额替代可执行资金路径。

RPC-04／RPC-06保持未完成，总体21/98。
