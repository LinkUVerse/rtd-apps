# C27：读取门禁停用期间的本地账户可见性

归属 QA-A17／QA-A22。C26 实际 Chrome 失败 profile 的只读副本证明：账户仍存在且锁定，余额 query 为 pending/idle，readAdmission observed 且 balances 被拦截。此前页面把 disabled query 当成持续加载，隐藏了账户卡片。原失败证明、profile、C26 全部 1,110 个源文件及 production 均保留。

- [x] D1 只读定位真实账户／React query／门禁状态，保存 C26 精确源文件快照。
- [x] D2 将本地账户卡片放到余额 Loading 外；停用余额读取时显示明确校验提示，继续隐藏余额及快照。
- [x] D3 Hook 实际 React／QueryClient 六项验证冷启动、checking／observed／unavailable 门禁、已缓存余额撤回、解除门禁后新读取、网络失败不转换为零。[定向日志](./20261006-C27-balance-admission-unit-01.log)。
- [x] D4 [182 文件／2568 全钱包单测](./20261006-C27-full-unit-01.log)、[完整 TypeScript](./20261006-C27-types-01.log)、[独立 production 构建](./20261006-C27-name-production-build-01.json)与[依赖图审核](./20261006-C27-name-production-audit-01.json)通过。
- [x] D5 [实际 Chrome 21 项](./20261006-C27-current-settings-ui-01.json)复测主题／语言 reload、锁定／解锁入口及关闭／重启保留账户；0 签名／模拟／派发，不清除准入 pending 或负面记录。未测试解锁后的完整业务读取，不能据此关闭 QA-A17／QA-A22。

本修复不把 pending 超时视为完成，不放开读取门禁，不改变观察 ticket 的归属或存储；遗留 pending 的生命周期恢复须另行证明，不能通过测试脚本清空记录掩盖。
