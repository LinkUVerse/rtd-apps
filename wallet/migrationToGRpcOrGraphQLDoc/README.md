# RTD TypeScript 前端从 JSON-RPC 迁移：研究与实施目录

核对日期：2026-09-24。本文把 Sui 官方的**技术规范**映射到 RTD fork；Sui Foundation 的服务停用时间、公开端点及供应商可用性不自动等同于 RTD 的运行状态。当前工作是源码与官方文档审计和实施设计，尚未修改两个前端，也没有把任何生产端点或真机验收标为通过。

## 结论先读

**前端不应一律迁往 gRPC，也不应一律迁往 GraphQL。** 钱包在客户端本地签名；交易构建所需链数据、提交、模拟、当前状态点查优先使用 `RtdGrpcClient` 连接具备 gRPC-Web 的 RTD Full Node。活动列表、收发地址相关交易、复杂筛选、对象版本和多资源页面优先使用 `RtdGraphQLClient` 连接完整部署的 GraphQL + Indexer 服务。标准顶层方法两种客户端都能调用，应按查询语义和数据保留期选后端，而不是按“前端/后端”这一标签机械选择。移动端对 gRPC-Web Fetch 的兼容性仍需真机验证；必要时把**已签名交易字节**交给可信服务提交，私钥仍留在客户端。

Indexer 不能独立替代 Full Node：索引负责筛选和历史目录；交易执行、模拟及最新链状态仍需要 Full Node。Full Node 修剪后的**已知 ID 点查**应由独立 Archival Service 或接好归档后端的 GraphQL 承担；任意年份的地址活动/条件筛选还需要有相应保留期的索引或应用专用索引。单有 GraphQL 服务进程不代表历史数据已经齐全。

本机 2026-09-24 00:34 的只读快照显示：新版 Full Node 在运行，但当前 `rtd-indexer` 部署没有 GraphQL/归档 Ledger gRPC，且它绑定的旧链 ID 与运行节点不同。这个快照不是对以后状态的断言；启动前须重新检查链身份、服务与索引水位。详见[数据服务拓扑审计](./03-数据服务拓扑与历史保留.md)。

官方两个页面的建议有不同着眼点：[Sui 数据接入总览](https://docs.sui.io/develop/accessing-data/data-serving)从数据访问模式给出“前端通常优先 GraphQL”；[TypeScript SDK 2.0 迁移指南](https://sdk.mystenlabs.com/sui/migrations/sui-2.0/json-rpc-migration)从一般应用代码迁移给出“默认 `SuiGrpcClient`，特殊索引查询选 GraphQL”。本目录把这两条建议合成**逐调用点决策**，并对照 RTD 实际源码。

## 阅读顺序

1. [01-协议选型与官方规范](./01-协议选型与官方规范.md)：官方规范、文档版本差异、gRPC-Web/GraphQL 能力与非 1:1 映射。
2. [02-RTD-SDK与前端现状审计](./02-RTD-SDK与前端现状审计.md)：SDK、Link-U Mobile、Chrome 钱包的实际版本与调用面。
3. [03-数据服务拓扑与历史保留](./03-数据服务拓扑与历史保留.md)：Full Node、Indexer、GraphQL、Archival 的依赖、修剪与部署责任。
4. [04-前端迁移实施方案](./04-前端迁移实施方案.md)：逐应用改造步骤、接口映射、交易与历史查询策略。
5. [05-验收矩阵与落地次序](./05-验收矩阵与落地次序.md)：服务就绪条件、回归用例、上线及停用 JSON-RPC 的门槛。

## 证据口径

文中“源码具备”只说明仓库存在实现，“配置已声明”只说明部署文件有配置，“运行可用”必须另有进程、端点与真实请求证据。官方示例中的 `sui` / `Sui` 在技术解释时映射为 `rtd` / `Rtd`，但绝不能把 `*.sui.io` 端点或 Sui 主网 Chain ID 当作 RTD 端点和链身份。示例 URL 用占位符表示，必须替换为自行部署并验收的 RTD 服务。
