# RPC-19 显式 checkpoint 归档 reader

日期：2026-10-04。部分完成；RPC-19 仍未勾选。

## 来源核对

核对[固定 Sui 源码](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-rpc-api/src/grpc/v2/ledger_service/get_checkpoint.rs)、当前 RTD 同路径 get_checkpoint.rs 与 SDK GetCheckpointRequest proto。请求选择器是 sequenceNumber／digest oneof；省略会返回 latest，默认 mask 为 sequence_number,digest。不能把摘要查询或高度查询参数缺失静默转换为 latest。

## 编码

新增 shared/rpc/archive-checkpoint-reader.ts。只允许 profile 显式 archiveGrpcWeb 的 GetServiceInfo／GetCheckpoint，HTTPS／本地规则由 profile 校验承担；请求禁凭据、禁 redirect、20 秒总预算、会话和调用方取消均有末端 fence。既不调用 JSON-RPC，也不回退其他服务。

调用必须且只能指定规范 u64 高度字符串或完整 32 字节 base58 摘要。读取前后核验完整 H0、lowestAvailableCheckpoint 与 head；已知高度超覆盖时不发送 GetCheckpoint。返回高度和摘要必须匹配选择器；创世高度摘要必须为 H0。拒绝下界漂移、头回退、摘要查询结果不在初始覆盖内或缺字段。成功结果附完整 binding、覆盖范围及 verification=service-reference。

此 reader 只返回可核对的服务定位信息，不请求或伪造委员会签名验证、BCS摘要验证或交易包含证明。实际归档可信度继续由证书摄取／发布门禁承担。没有扩展 checkpoint 列表、分页浏览器或新增原先未使用的业务页面；本项对应 Task RPC-19 明确的受限 checkpoint 选择器范围。

## 证据

[定向测试](./20261004-archive-checkpoint-tests.log)：checkpoint 12 项＋已有历史对象 9 项，共 21 项通过。覆盖双选择器、latest／非法／溢出、错链、水位回退／缺失／漂移、缺结果、错高度、错摘要、范围外返回、会话关闭与无 fallback。

[完整类型检查](./20261004-archive-checkpoint-types.log)：隔离冻结安装副本退出 0。实际公开 archiveGrpcWeb、可信发布门禁、Chrome 消费路径未验证，因此不能据此完成 RPC-19 或宣布试用。此前 SDK BCS 类型中 CheckpointSummary 为 null；本批没有借用不完整客户端 BCS 类型宣称证书独立验证。
