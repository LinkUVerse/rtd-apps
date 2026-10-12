# RPC-21 名称接口与消费端编码核验

**后续审计更正：RPC-21重新打开。后台收款bytes检查只识别TransferObjects，尚不支持OriginByte的Move调用路径。本日志仅证明常规路径，不能作为全部名称发送分支完成证据。见20261004-background-name-expiry.md。**

## 范围

完成名称正向、单个默认反向显示、Coin／NFT名称发送的新读取接口和消费端合同。实际部署ABI、同链改名／续费、Chrome确认与动态网络验收留在QA-A15／TRY／ENV；当前dev profile未配置name，不能把本项当作实链名称功能通过。

## 合同核对

- WalletNameReader只读profile显式package／forwardRegistry／reverseRegistry，以原生GraphQL动态字段读取。检查字段派生ID、name BCS、类型、精确BCS重编码。无registry不请求。
- 每次收款解析重新创建读取快照，Fullnode完整H0与开始高度限制GraphQL共同S；终态重验同链及lag，不把错误当作名称不存在。Clock、正向与反向固定同S。
- 叶记录沿祖先检查注册NFT及期限；无目标／过期为null。反向结果必须正向回到请求地址，仅代表默认名。
- WalletRpcProvider三态均显式提供接口，未配置拒绝；无可用session拒绝；有效session通过WalletNameReader，不走旧Kit或JSON-RPC。
- 默认名称hook按binding／readSession／地址隔离，禁止持久化；刷新失败、TTL耗尽、会话不匹配撤下。此次补充：即使binding未变，Provider进入initializing也撤下旧缓存；非有限期限不显示、不创建期限计时器。
- 地址验证无一分钟成功缓存。SendTokenForm重新解析并以assertCoinTransferDraft锁定gas预览目标；Coin复核构建前及签名前解析结果。NFT准备器同样核对name／最终地址／binding／session，表单另排除sender／对象地址。
- Coin确认页使用formData.to展示最终地址；NFT确认页并列名称、箭头、最终地址。目标变化不会重写已批准bytes，必须重新预览。
- 上一批已补齐模拟完成后名称期限复查；此次保留两类发送器回归。

## 验证

- 5文件111项定向测试通过：name-reader 32、name-hooks 8、name-validation 6、coin-transfer-preparation 23、nft-transfer-preparation 42。
- 对非法期限测试进一步等待React Query缓存成功并刷新通知后复验：name-hooks 8项通过，避免仅检查初始空状态。
- 钱包完整tsc退出0。dev Webpack构建成功（30.423秒），四入口静态审计通过；日志20261004-name-consumers-webpack.log、20261004-name-consumers-built-audit.json。
- 上一批全量99文件1057测试通过；此次新增4项展示测试后尚未再次全量，不能将上批全量数用于本批。
- 日志：20261004-name-consumers-tests.log、20261004-name-display-tests.log、20261004-name-consumers-typecheck.log。

## 官方来源

[Sui固定name-service源码](https://raw.githubusercontent.com/MystenLabs/sui/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-name-service/src/lib.rs)已在上一批在线核验；钱包04／archive03的6.3记录GraphQL反向resolver快照差异和原始资料哈希。钱包20秒／20checkpoint预算是本地保守策略，不能称为Sui官方保证。

后续闭合：OriginByte参数检查已接后台并通过命令集成与真实Fullnode目标owner只读校验，见20261004-originbyte-background-integration.md。RPC-21按接口编码范围恢复完成；此前更正与真实验收边界仍保留。
