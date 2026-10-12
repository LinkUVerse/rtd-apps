# C259：C257 普通 Chrome dApp 实际执行完成

使用已经获准导入的0xbad0开发账户和既有审核demo，在同一C51/C257中进行本地dev自转1原子单位RTD。审批前逐项核对最终BCS、发送/接收地址、两个输入、两个命令、预算2988000、有效epoch5–6及H0。新意图和原C256完全独立，未复用旧签名。

[预览审核](./20261011-C259-execution-preview-audit-01.json)、[一次批准记录](./20261011-C259-submit-attempt-01.json)、[完整执行审核](./20261011-C259-execution-audit-01.json)通过：

- 原摘要 `3WPnBEUtoARyTrRRNXyoR8v24CtRV3cS3hBiGaCUnfT7`，独立原生GetTransaction确认checkpoint **2007000**，成功。
- 实际只有一次ExecuteTransaction；完整交易字节、签名验证与执行返回一致，净Gas **1997880原子单位**。dApp实际返回相同摘要和success=true。
- 完整worker记录64请求：42 GetServiceInfo、17 GraphQL、3 SimulateTransaction、1 VerifySignature、1 ExecuteTransaction。全部200，原生帧完整解码，17 GraphQL的H0均核验通过；目的地仅本地Fullnode41750、GraphQL41957、归档HTTPS41903，无JSON-RPC或Sui公网。
- VerifySignature发起至ExecuteTransaction发起 **6.384秒**，执行请求本身 **175.569毫秒**。64请求包含审批前后准备及人工审计等待，不能称为一次首页刷新成本，也不能由单样本宣称普遍P95改善。

C257的代码/测试/产物/安装与当前dApp正向执行闭合，P257-3完成。原C256没有执行终态；此轮成功不能证明旧交易未执行，也不能反推其精确根因。0xd50b原待确认journal继续保留，不重发、不删除。

[实际UI03](./20261011-C259-native-ui-03.json)记录dApp断开、标签页关闭并回到钱包，当前0xbad0余额999.98。[清理证明](./20261011-C259-cleanup-01.json)对61973的启动时间和命令逐字核对后仅SIGTERM本轮静态服务，5181端口已释放；没有停止核心服务、改容器或镜像。

本段补足REL-02的当前dApp实际执行证据；名称、NFT写后索引/隐藏、质押赎回、完整回放和全环境冷启动仍按原合同推进。98原父项仍93，QA19/22、REL3/5，未虚增完成比例。
