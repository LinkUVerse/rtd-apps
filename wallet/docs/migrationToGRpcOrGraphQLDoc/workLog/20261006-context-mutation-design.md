# E4 真实状态写入屏障：编码前清单

承接 E3 正式数据库 44 项原生验收。当前 58/98，产品源码 1087/d0b8767b，dist 仍为 C16。本批不操作原账户、密钥、7 个 journal，也不启动交易。

| 写入入口 | 屏障范围 |
| --- | --- |
| NetworkEnv.confirmCustomProfile/setActiveNetwork | 网络 storage 提交前开始，提交及 selectionEpoch/changed 后结束 |
| Permissions.storePermission/delete | 保存许可与撤权的 storage 提交及通知；不是仅监听 changed |
| session-ephemeral-values.set/clear | 所有账户及账户来源的解锁材料写入/删除；读操作不启动代次 |
| accounts.changeActiveAccount/addNewAccounts/removeAccount | 账户 Dexie 事务之前开始，真正 commit 之后结束；Qredo 删除在同一事务中 |
| MnemonicAccountSource/QredoAccountSource.save | 独立调用提交之后结束；已有调用者事务时保持 pending 到调用者 commit |
| legacy storage migration | 整个账户和来源事务，包括嵌套 source.save |
| db.init | 首次自动 schema 升级、backup 恢复及 populated 设置；失败保持未知 |
| UI clearWallet/resetPassword | 网络/权限清除、账户库删除或密钥替换整个操作 |
| background onInstalled 旧格式迁移 | storage 清除及权限/选中账户重置 |

昵称、警告展示标记、只读备份序列化不提供签名权限，不额外作为上下文 authority。锁状态 metadata 由其更早的 ephemeral 屏障改变 revision；后续监听不得作为前置屏障替代。

后台 controller 无 import 时 IO；账户类被 UI 间接导入不会重置 epoch。仅 worker 显式启动或第一次后台写入惰性启动同一 promise。失败缓存为失败，不用内存准入/重试新 epoch。每次写入必须在 strict native complete 后才开始外部操作；失败保留自己的 pending，不能 finally 清除未知。

Dexie [官方 waitFor 文档](https://dexie.org/docs/Dexie/Dexie.waitFor())要求等待期间不要操作同一事务。实现分别等待另一数据库 begin 屏障，再执行原账户事务操作。已有 Dexie transaction 的叶子写入将结束动作挂到 complete，绝不在账户 transaction callback 内等待该 transaction 自身完成；abort/error/操作失败保持 pending。外层业务屏障在 transaction promise 成功后结束。不得以全局 nesting depth 跳过并发操作。

先保存本批修改前逐文件源码和 verifier，再实现。验证需覆盖 worker/UI 启动、一次启动并发、失败不调用外部操作、嵌套 native Dexie commit/abort、held receipt 在实际 storage/账户变化后拒绝。只有全部入口组合到真实出口并完成实际 UI/worker/原数据回归，才考虑关闭父任务。本批阶段证明继续分别标记，不把候选/native fixture 当产品试用。
