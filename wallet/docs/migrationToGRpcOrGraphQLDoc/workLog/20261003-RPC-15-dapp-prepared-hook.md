# RPC-15：dApp 详情／Gas 共用新交易准备结果

日期：2026-10-03；此批仅完成预览数据准备接入，dApp 批准全链路尚未完成。

## 实施

- useTransactionData 删除旧 dApp Kit client 和直接 build 调用，改为 usePreparedTransaction 调用现有 Fullnode resolver＋正式模拟准备器。
- 缓存键含完整网络 binding、读会话、规范 sender、事务序列化输入；各详情／Gas消费者共用最终准备结果。queryFn从键对应的序列化输入克隆，不读取后来被修改的 Transaction，也不改变调用方对象。
- 详情与 Gas 数据从准备器返回的最终 BCS bytes 解析，暴露同一 prepared 对象供下一步批准链路接入。当前准备器已负责正式模拟、sender／gas／expiration约束。
- 查询禁持久化、gcTime0、无自动重试；失败隐藏旧数据。账户／会话／输入变化隔离，AbortSignal和迟到检查阻止旧结果替换新预览。Fullnode会话可在GraphQL尚初始化时独立准备。

## 验证

- 新增6项真实React＋QueryClient测试，使用真实Transaction序列化／BCS与受控准备器返回。验证共享一次准备、最终bytes中Gas／大版本精度、克隆隔离、输入更新、账户与会话隔离、失败清数据、迟到取消和Fullnode独立准备。
- 完整定向回归54文件、675/675通过；RPC类型检查exit0；完整钱包exit2，110条诊断（前111），此次三个文件无直接诊断。[验证记录](../evidence/20261003-dapp-prepared-hook-verification.json)。
- 未运行真实链、Chrome扩展、dev启动或合约部署；测试替身不能证明dApp在线签名或执行。

## 明确剩余

批准页仍调用旧useTransactionDryRun／useTransactionSummary，respondToTransactionRequest仍重建并走旧WalletSigner，故未达到同bytes批准／签名端到端不变量，不能试用或勾选整项。下一步必须合并模拟展示到同prepared结果，更新批准请求、background请求关联／origin／chain授权、sign-only与execute返回契约及持久恢复；不能以本批预览接入代替完整迁移。
