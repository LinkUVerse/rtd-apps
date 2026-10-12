# 2026-10-04 发布身份与同机副本

## 实施

指定合约部署仓库新增 `prepare_wallet_publication_authorities.py`。入口首先复核独立 debug 链 H0／foundation 绑定，并要求当前源码证据核验通过的 source v3。identity 阶段复用归档 `dev_publication_identity.bootstrap`；已有 lease 只复验，不重复分配身份。replica 阶段先确认发布准入关闭，再创建或复用端口一致的副本；verify 阶段不启动或重新配置服务。

归档 `dev_replica_store.initialize` 的兼容范围从 source v2 扩至 v2/v3；仍调用 `inspect_source`，保留源作用域、证书输入、构建证据和所有原有 replica 绑定验证。副本不依赖 writer 的 Docker／native 执行形式。

## 当前环境证据

- H0：`3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj`，generation `dev-20261003-01`。
- 初始 lease requestId `108f3315-10cc-4648-aa2f-9a2bc49e48f6`，epoch 1，active。
- PostgreSQL 两类 runtime 角色均为非管理权限，TLS verify-full 请求成功；publisher 无权改 epoch，coordinator 无权改 published_hi。
- publisher／coordinator 不带 fence 的 published 写入均被拒绝；publisher 当前 epoch 与存储提交时 fence 一致。
- `newPublicationEnabled=false`，未启用认证发布。
- 独立 replica project `rtd-dev-wallet-pub-20261004-replica`，HTTPS loopback 39582，独立卷；源／副本均启用 versioning，复制规则绑定当前 sourceId／published 桶，禁止复制删除。
- 新 foundation 的 S3 为加载同一私有 CA 进行过一次受控重启，卷保留；未操作旧内部归档 project、RTD 链或 GraphQL。
- 初始化后独立 `--stage verify` 成功，见[复验日志](./20261004-publication-authorities-verify.log)和[结构化证据](../evidence/20261004-publication-authorities.json)。

## 测试与边界

5 项部署入口守卫测试通过：错误链／旧 source 拒绝、原身份复用、已开放准入拒绝先于副本操作、已有端口不一致拒绝、verify 无服务启动。原 2 项副本 CA／符号链接测试通过。

副本当前仅证明 TLS、versioning 与复制规则配置，不证明真实 checkpoint 对象复制。没有调用保留测试物件的 `probe`，避免把交付 workspace 标记为 probe-only。下一步接当前 debug verifier 的认证发布者，按同版本复制完成与数据库提交联合验收。公开查询、持续源和 Chrome 核心试用仍未完成，ENV／TRY 不勾，总体仍18/98。
