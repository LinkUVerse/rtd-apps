# C234：系统解锁后的普通 Chrome 验收与当前阻塞

2026-10-11；实际安装 C227，独立 C51，账户 0x9d76…e5bc，零余额。用户已解锁 macOS，旧三轮锁屏阻塞已解除。以下均区分原生 UI/HAR 与生产 reader 离线重放。

| 场景 | 实际请求 | 结果与边界 |
| --- | --- | --- |
| 首页暖导航与两轮自动刷新 | 8 GraphQL，0 新 gRPC | 两个完整周期各 4 次；不是冷启动。原生余额显示 0 RTD；发送/兑换禁用原因与零余额一致，质押可进入 |
| 质押列表 | 11 GraphQL，0 新 gRPC | 16.660 秒；生产质押 reader 对原 HAR 逐请求重放通过，一个验证者、零持仓、snapshot 1006768 |
| 质押数量表单 | 26 GraphQL、3 gRPC | 3 次 native 帧经真实 FullnodeReader.balance 核验为 0；GraphQL 包含后续未完成周期，不能将所有周期都计通过 |
| 质押后退/前进，间隔 7.027 秒 | 21 GraphQL、3 gRPC | 一次 GraphQL 被取消，剩余 23 请求 HTTP 200；发现共享质押读取随子路由卸载被取消后重启，列入 C235 修复 |
| 活动页 | 5 GraphQL | 18.413 秒；仅核验 0..1006768 已覆盖空历史窗口，不代表全部账户历史 |
| 应用页 | 0 请求 | 原生 Network 在记录状态连续观察 91.134 秒；空列表，无 HAR（空日志不可伪造导出） |

原生 UI 观察均来自本轮 CUA accessibility，未读取 DOM 或注入运行时代码。应用页 91.134 秒为会话内计时，未生成独立截图/网络文件；不作独立可重放证据。

证据：`workLog/20261011-C234-home-warm-two-cycles-01.har`、`staking-01.har`、`staking-form-01.har`、`staking-navigation-7seconds-01.har`、`activity-01.har`（后四项同 C234 日期前缀）；首页 audit-03、staking-audit-01、staking-form-balance-audit-01、activity-har-audit-01。首页初版对暖 HAR 错误要求 pages=1；保留 audit-01 失败，v2 仅修正为 pages=[]/无 pageref，第二次错误 cwd 日志也保留；第三次通过，未覆盖失败。

Console 中观察到 Ampli 未初始化错误：外部服务禁用时初始化提前返回，但 UI 仍调用埋点。没有启用遥测来消除提示，也未将这类 Console 文本误判成 RPC 网络失败。

当前后台：实际 36 actors / 117 containers / 24 foundations 范围核验通过。41 持久管线最低 checkpoint 358995，固定 0..709569 范围数据进度 50.5935%，仍不等于全数据比较/WAL恢复验收。当前名称生产 reader 在 native 1880487 对覆盖 1006768 时返回 coverage，属于未通过；发布父 93647 / 子 42853 仍活跃，锁为 1，发布前缀检查已完成 195876；不停止或绕过发布。

非空账户浏览器验收仍等待用户确认导入既有 dev 夹具 0xd50b…077c。导入空表单已就绪，未读取/输入私钥；Chrome 升级持续授权有效。总体 93/98，五父项 QA-A15/17/20、REL-02/05 保持开放。
