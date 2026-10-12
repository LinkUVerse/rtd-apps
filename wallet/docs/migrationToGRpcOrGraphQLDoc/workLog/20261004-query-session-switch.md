# NET-12：查询会话切换隔离验证

日期：2026-10-04。

## 编码合同核对

| 合同 | 当前实现证据 |
| --- | --- |
| 网络绑定 | profile.ts 的 networkBindingKey 包含 profile id／revision、H0、generation、四类服务 URL、SDK／Wallet Standard 网络及合约配置 |
| 同网络重新进入 | WalletRpcProvider effect 关闭旧 WalletReadSession；每次新 session 的 cacheKey 带新 UUID，重建全部领域 reader／SDK 客户端 |
| 资产与分页结果 | core asset-hooks／coin 及 wallet useGetAllBalances 使用 bindingKey + readSessionKey + assetSnapshotKey + operation + normalized arguments；reader 内收集完整同快照分页结果，不外露跨会话游标 |
| Fullnode／历史／名称 | fresh coin／balance、receipt、history、name、indexed list、recipient hooks 使用绑定与会话键，以及规范化账户／摘要／筛选参数；向 reader 传入 Query AbortSignal |
| 回执和预览 | stored-receipt hook 绑定 account id／address／digest；prepared transaction 绑定 sender、交易序列化内容及 dApp request，拒绝错会话预览；不持久化 |
| 取消与迟到返回 | Session close 中止 session signal；request／read 在完成后再次检查会话；TanStack 账户查询失去观察者时取消旧 signal；领域查询 gcTime=0 |
| 网络 UI | changeActiveNetwork 先完成后台网络更新，再清 queryClient 并更新活动网络；后台执行会话也监听网络／账户变更。执行 pending 不随 query cache 清除 |
| 持久缓存 | 上一轮 cache-restore 修复在保存与恢复两端过滤 wallet-*、skipPersistedCache、非成功查询和全部 mutation；保留旧 v1，不用它恢复 |

外部价格查询不是链状态，仍绑定网络与币类型并禁用持久化；ExplorerRpcContext 是 Explorer 独立消费者，不作为钱包链缓存。账户／账户来源查询使用 skipPersistedCache。

## 新增迟到矩阵

`query-session-switch.test.ts` 使用实际 React Provider、余额 hook、TanStack QueryClient 和 GraphQL reader。仅底层 fetch 为双 SDL 校验过的协议夹具，不替换领域 hook。

六种切换：账户、profile revision、GraphQL endpoint、generation、H0、离开后重新进入同 profile。每种分别让旧 fetch 在新余额已显示后返回成功或抛错，共 12 场景。断言真实传入的 AbortSignal 已取消；旧 111 余额从未渲染；新 222 不被迟到成功／错误覆盖；旧 query 被移除；网络维度切换具有新 session key。

`20261004-query-session-switch-tests.log`：12 项通过。`20261004-query-session-switch-regression.log`：5 文件 33 项通过，另覆盖缓存恢复、重新准入失败撤下旧余额／元数据、Fullnode 账户切换、Session 迟到屏障。`20261004-query-session-switch-typecheck.log`：钱包 tsc exit 0。

本轮仅新增测试与浏览器验证工具，业务构建沿用上一轮 cache-restore 的已核验产物。单测迟到返回不当作实链服务故障验收；真实提交后的切网／切账户授权与恢复属于 TX 条目。


## Chrome 场景与前提修正

新增只读 query-session-switch-ui helper：在当前临时 profile 内创建公开确定性第二账户，正常密码解锁后切换；核对新地址实际空集合与旧行消失；切回原账户核对完整 13 对象请求和 9 个 package 类型页面行；切至未配置 devNet 撤下全部旧行，重新进入 Local 必须重新查询并恢复页面。最后仅移除本测试创建的第二账户，再执行原生命周期的锁定与整浏览器重启核验。执行 journal／保留 profile 不变。

初次 browser.log 与 diagnostic.log 均失败。诊断确认第二账户默认锁定导致 useUnlockedGuard 将页面带到 #/tokens，测试错误地继续在首页统计资产行；新增账户的正常密码解锁已补齐，未修改业务守卫。此前失败日志保留。


## 最终 Chrome 结果与逐项结论

`20261004-query-session-switch-unlocked.log`：passed=true。第二账户 S99351 完整集合为空，页面旧资产撤下；切回原账户 S99404 重新获取完整 13 个对象并呈现 9 个 package 类型行；devNet 未配置状态撤下旧内容并显示明确错误；回 Local 在 S99414 重新获取 13 对象。导入／密码、锁定／错误密码拒绝／解锁、整浏览器重启后的账户保留与锁定全部通过。全程 0 模拟、0 提交。仅移除本次临时创建的第二账户。

NET-12 的四个要求现在有直接证据：query scope（源码键清单、12 场景切换矩阵、真实账户查询）；persist 版本升级（v1 隔离和 v2 双端过滤实际库测试）；取消（传入真实 AbortSignal 及忽略取消的迟到结果矩阵）；网络重置（Provider 重建会话、实际 Chrome 未配置网络往返和新 GraphQL 请求）。本项标记完成。

边界：Chromium 使用精确 dev 叶证书 SPKI 和预编译 Local profile；迟到成功／失败是协议夹具；真实交易提交后切网／切账户、权限原生弹窗、全部服务故障和试用期跨设备回归仍由 TX／ENV／QA 跟踪，不借本项关闭。构建仍为 cache-restore 产物：UI 9b991fd71c62d68f3e4beec763be4262211a090d2382fc3b46c03f0cc8c8984f，background d11c911981cc817408cea3374cf534728429b801dd46c3ef86d6eca0f092acc0。
