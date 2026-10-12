# NET-12：持久缓存恢复边界修复

日期：2026-10-04。

## 问题与复现

已有 queryDehydrateOptions 仅在保存时排除 wallet-* 领域查询、skipPersistedCache 查询及所有 mutation；persister.restoreClient 却原样返回当前 v2 命名空间的数据。若同版本缓存曾由未经过筛选的 writer 写入，恢复入口仍会注入这些查询及暂停 mutation。

通过实际 persistQueryClientRestore 恢复一个绕过保存过滤的测试快照，再调用实际 resumePausedMutations，修复前的测试确实触发一次夹具 mutation 回调；证据 `20261004-cache-restore-before.log`，1 失败／2 通过。未发送任何网络或链交易，也不声称当前 UI 自动调用 resumePausedMutations。

依据：[TanStack 官方 persistQueryClient 文档](https://tanstack.com/query/latest/docs/framework/react/plugins/persistQueryClient) 将保存的 dehydrateOptions 与恢复的 hydrateOptions 明确区分，恢复会装入持久 query／mutation。此次修复针对钱包缓存合同，不涉及改变 Sui 或 RTD 协议语义。

## 变更

- queryPersistence.ts：复用同一允许查询规则；filterPersistedQueries 在读取快照时去掉所有 mutation，过滤链数据、隐私数据和非成功查询，检查基本快照结构。不修改传入对象，保留原 timestamp／buster，继续由库执行年龄与版本检查。
- queryClient.ts：保存与恢复均调用该边界函数；直接调用 persister 保存也不能绕过规则。
- 保留 v2 键名及 buster；旧 queryClient.v1 不读取、不删除。执行 journal 不受影响。

## 验证

`20261004-cache-restore-tests.log`：1 文件 7 项通过，包括实际库恢复与唤醒入口、普通查询保留、直接保存防绕过、无效结构、旧命名空间隔离。`20261004-cache-restore-typecheck.log`：钱包 tsc exit 0。

该故障夹具不能代替真实服务断网、跨账户／跨网络切换全矩阵；NET-12 保持未完成。


## 新构建与实际 Chrome

Webpack exit 0（35832ms），四入口依赖审计通过，见 cache-restore-build.log／cache-restore-artifacts.log。

`20261004-cache-restore-browser.log` exit 0：新构建实际资产读取（快照 [97725]）、10 个非视觉对象及空 Kiosk 详情、账户密码导入、锁定／解锁、错误密码拒绝、整浏览器重启后账户保留并锁定均通过，0 模拟／0 提交。浏览器测试没有向真实 profile 注入恶意缓存；故障复现边界仍是实际库测试。

当前 UI SHA256：9b991fd71c62d68f3e4beec763be4262211a090d2382fc3b46c03f0cc8c8984f。
当前 background SHA256：d11c911981cc817408cea3374cf534728429b801dd46c3ef86d6eca0f092acc0。

测试使用精确 dev 叶证书 SPKI，不代表正常 CA 与自定义网络权限验收。
