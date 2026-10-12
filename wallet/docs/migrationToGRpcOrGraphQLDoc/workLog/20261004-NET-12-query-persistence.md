# NET-12 查询持久缓存迁移

核查发现 UI 仍使用迁移前 `queryClient.v1`，并仅声明 shouldDehydrateQuery，没有显式禁止暂停 mutation 的默认脱水行为。现代链 hooks 已有 skipPersistedCache，但持久命名空间和 mutation 边界仍须明确。

新增 queryPersistence 策略：新版存储键与 buster；所有 wallet- 查询和带 skipPersistedCache 的查询排除；所有 mutation 排除；其它成功查询继续保留。实际 PersistQueryClientProvider 已接策略，IDB persister 改用新键。旧记录不删、不读；交易 journal 未改。

回归使用真实 TanStack QueryClient／dehydrate 构造暂停提交，确认默认可以脱水而新策略排除；链查询即使漏写 metadata 仍排除，私有账户查询排除，普通成功 Apps 数据保留。IDB mock 检查仅访问新键，不访问／删除旧键。连同 session 迟到成功／失败拒绝测试，两文件4项通过，见[日志](./20261004-NET-12-cache-tests.log)。完整钱包类型检查退出0，见[日志](./20261004-NET-12-cache-typecheck.log)。这不代替真实 Chrome 重启／切网验收，NET-12 整项保持未完成。

实际开发版 Webpack 在36.981秒编译成功，保留现有 Tailwind 类名歧义警告，见[构建日志](./20261004-NET-12-cache-build.log)。对新产物重新执行四入口旧 Kit／旧请求器静态审计通过，JS与source map SHA均已记录：[证据](../evidence/20261004-NET-12-built-graph-audit.json)。本轮没有重新构建生产版。
