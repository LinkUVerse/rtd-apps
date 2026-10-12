# 固定上游 GraphQL 测试契约

`sui-c8601468.graphql` 是测试所需的公开 SDL 源码，不是钱包验收原始响应。将其放在测试目录，避免单元测试依赖不提交的私有验收证据。

- 来源：[MystenLabs/sui 固定提交](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-indexer-alt-graphql/schema.graphql)
- 提交：`c860146823abcedef45a1b5a9c766920be98a29c`
- SHA-256：`1070a49d16284448ac9e3da60b8e3d9aadf2a48cd10330f0a07569e519d55bec`
- 上游版权：Mysten Labs, Inc.；Apache-2.0，见仓库许可证。

RTD 扩展仍使用当前 RTD 服务导出的 SDL 校验；此文件只用于独立的 Sui 原生字段对标。
