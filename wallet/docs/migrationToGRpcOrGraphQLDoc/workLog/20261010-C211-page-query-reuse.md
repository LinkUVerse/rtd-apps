# C211 页面查询复用与活动接口性能

## 已完成的源码与服务优化

1. 同一个 GraphQLSnapshot 实例的重型 Read/Revalidate 并发请求可以合并；不同实例不混合，轻量余额/元数据仍独立于重型领域。每个逻辑 reader 的结果、后验、取消和错误检查保持。不是省略复验，也不缓存已经完成的网络响应。
2. 合并 envelope 按实际 UTF-8 JSON 字节在 5000 bytes 内拆分，沿用 RTD GraphQL 默认 payload 预算；不限制总调用数，不丢弃输入。每一组传输失败仅拒绝本组，其他分组继续返回；不增加传输重试。
3. 余额、元数据、质押的非活跃查询保留 5 秒，活动保留 10 秒，分别等于原 freshness 窗口。原 staleTime 不延长；网络、会话、账户、准入代次仍参与 key；已知负向仍立即隐藏结果；禁用持久化缓存。资金准备、新鲜余额/coin/object、名称和收据保持原新鲜性语义。
4. 活动查询的跨批次 checkpoint 摘要核验原本扫描约 85 万行。新增两条 checkpoint 前导覆盖索引，不改校验 SQL、业务数据、读写权限或已封存 schema 摘要；通过 `CREATE INDEX CONCURRENTLY` 安装，服务未重启。

## 实证

- `20261010-C211-full-regression-02.log`：193 files /2789 tests 全通过；`typecheck-rpc-02`、`typecheck-prod-02` 均通过。旧回归曾依赖缓存数组第一个元素，改为检查实际观察中的查询。账户切换取消/迟到结果测试仍保证旧响应不写入缓存；网络/会话更换仍删除旧查询。
- 全测试还发现旧 `c41-nft-draft-retention.test.ts` 脚本夹具的 alias mock 没有命中实际模块。改为精确路径并提供只用于测试的扩展 manifest/getURL，8 个草稿保留用例通过。未改生产 NFT 行为。
- `20261010-C211-live-reuse-02.json`：真实服务首页三轮各 4 GraphQL，2999/2936/3345ms；质押 11 次、8471ms（C210 首轮13次）。并发 Fullnode 余额仍5次，后续仍可检查相同业务请求复用。
- `20261010-C211-live-pages-01.json`：资产/Kiosk 空集合和活动完整当前窗口读取通过；活动16670ms，当前无交易。仅 CLI reader 证据，不是浏览器或非空资产验收，也不将有限覆盖声明为所有账户活动完整。
- `20261010-C211-checkpoint-index-applied-01.json`：保持同一个 checkpoint/摘要，安装前 SQL 125.632/158.697ms，安装后0.442/0.041ms；执行计划使用新索引，两个结果一致，权限不变。
- `20261010-C211-account-timing-after-01.json`：coverage+page 两调用共约8.34s，SQL合计660ms、GraphQL合计204ms；剩余主要为四次发布准入。旧两轮约16.10s/10.24s，受实时负载影响，不宣称固定端到端降幅。读前读后发布准入仍保留。

## 构建与验收状态

C211 独立生产构建与完整闭包审核通过。source `58bcdd831b86c601ac0daee3c787079d798e4c8ae29fe47a5954caabc21483c4`，1128 files；6 个生产模块变更、0新增/删除模块。后台仅 graphql-snapshot/snapshot-query-queue 两模块变化；manifest、profile、registry 与权限不变。

候选已准备到原路径升级暂存区，当前安装仍为 C210。C211 最终升级确认已发出；未安装、未进行新版普通 Chrome 页面验收，因此 P211-4 不勾。P211-2 的其余 Fullnode 业务读取复用、P211-3 剩余准入耗时及 P209-6 全页面/非空范围仍待，原98父项保持92/98。

## 可重现脚本

- 钱包：`scripts/probe-C209-live-pages.ts`、`probe-C209-live-reuse.ts`、`qualify-C211-query-reuse.py`、`prepare-C211-ordinary-upgrade.cjs`。
- 合约部署仓库 localDeploy：`diagnose_wallet_C211_account_timing.py --reader <reader.json> --output <fresh.json>` 只读分阶段计时，不记录SQL参数或凭据。
- `optimize_wallet_C211_account_checkpoint_reads.py --foundation <foundation> --reader <reader.json> --output <fresh.json> [--apply]`：默认只读；显式 apply 才安装两条并发索引，并对照原结果与执行计划、确认索引有效。DDL位于归档服务 `modules/account-activity/checkpoint_read_indexes.sql`。既有基础 schema 文件保持不变。

## 剩余父项依赖最新实读

旧 C199 观测器因 C208 已记录的网关上游变更而退出，失败日志保留。新 `verify_wallet_C211_current_gateway_scope.py` 对照 C198 原始备份与 C208 prepared/applied，严格要求唯一差异为41981→42031、全部原输入及容器身份/挂载/启动时间保持；其余36进程/116容器检查保留，不跳过不匹配。

新只读观测 `20261010-C211-retained-all41-watermarks-02.json`：23 SQL、14物理HBase、4 Rocks持久管线最低212994，共212995/709570=30.0175%，尚差496575个checkpoint。实际Consistent范围12686–212995；不是全范围重放成功。即时水位已更新到 current-C139-replay-progress.json。

`20261010-C211-publication-progress-02.json`：正式published1006768、pending1482841、prepared64177；原publisher93647及其当前子8386活跃，发布锁1。prepared从旧33680增长，证明发布阶段在推进，不能仅因父状态长时间未刷新而杀进程。handoffAdmission仍false，未重启/停用原发布或重放服务。

因此 QA-A15 当前正式发布名称矩阵、QA-A17完整重放/换代、QA-A20完整保留数据冷启动和WAL仍缺各自最终证据。QA-A19普通网页获准来源正例仍待；REL-02全功能实际流量及REL-05终审仍不勾。此轮优化和流水线进度均未被冒记为这些父项完成。
