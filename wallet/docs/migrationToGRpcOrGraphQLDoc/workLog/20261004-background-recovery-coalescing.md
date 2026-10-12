# TRY-02 保留账户币发送与后台恢复合并

## 已发现的问题

在保留的公开测试账户浏览器中准备一次最小金额自转。指定 rtd 源码／工作树差异／debug 二进制哈希重新核对一致，见 `20261004-pre-coin-debug-recheck.json`；原 dApp 档案 4 笔成功 journal 再次只读核验通过。

第一轮 `20261004-retained-coin-execution.log` 使用后台命令解锁后立即切换同页 hash，尚未等待 UI 账户同步，跳回 tokens；0 模拟／0 提交且没有批准标记。改用实际解锁账户弹窗并等待关闭后，第二轮 `20261004-retained-coin-execution-ui-unlock.log` 进入确认页，但恢复忙提示导致批准按钮不可用；2 模拟／0 提交，仍没有批准标记。两轮失败均保留，未更换档案重发。

已有页面 effect 去重仅处理该组件的 StrictMode 重放；后台 onConnect／账户事件唤醒可与 UI 显式恢复同时争用相同执行锁。保留 journal 的实际场景证明页面去重不足以覆盖跨入口并发。

## 后台实现

`recoverWalletExecution` 在每个调用方完成账户与网络准入后，按 bindingKey／accountId／规范地址合并进行中的只读恢复 Promise。每个调用方取得共享结果后再独立 authorize；完成或失败立即移除引用，不把内存记录作为 journal 或准入依据。

不同 profile revision 不共享结果；当前账户切换后等待者均拒绝旧结果。`executeWalletPrepared` 不加入合并，恢复持有互斥锁时执行仍拒绝；没有取消签名锁、跳过 pending、变更 journal 状态或自动重发。

38 项相关测试与完整钱包 tsc 通过，覆盖同会话并发单次读取、完成后重新读取、账户切换拒绝、profile revision 隔离和恢复持锁禁止执行；包括既有 background 执行、恢复唤醒及发送页测试。日志前缀 `20261004-background-recovery-coalescing-*`。构建和最终浏览器结果继续记录。

## 执行测试防重复

测试脚本 `test-retained-coin-execution.cjs` 复用 `staking-execution-browser-01`，保留原质押成功记录。执行模式要求没有 coin-attempt.json、近期 dApp 终态审计、原 journal 仅包含已知成功质押。批准前 wx＋fsync 写入 coin-attempt.json，之后拒绝再次执行模式；只读模式从已保存摘要或唯一新增 journal 恢复。批准消息观察器只读取原 UI 发送的 digest／requestId／unsigned bytes，不修改后台入参；随后校验本地 bytes 摘要、sender、成功 effects 和重启 journal。

本轮不触碰部署者账户的两笔待确认记录。正常 CA／主网、真实链失败、完整试用仍未验收。

## 实际发送最终成功

最终 `20261004-retained-coin-execution-worker-diagnostic.log` 退出 0：实际账户解锁弹窗、1 原子单位自转表单和最终批准完成；4 次模拟、1 次提交。摘要 `AaAKoHj3DgqcwWBvTpPJLjaCwAd2zgoszj1Bu7MKrnSr`，批准 unsigned bytes 本地摘要与后台入参一致、sender 匹配，成功 effects 与该摘要一致，同摘要收据跳转正常。整浏览器重启后账户锁定，只读恢复命令通过，两笔 journal（原质押和本次自转）均为 confirmed-success，没有重发。

保留文件为同一档案中的 coin-attempt.json、coin-approved.json、coin-confirmed.json、coin-restart-verified.json；此后 **不得再次以 --execute 运行该脚本**。只读模式仍可查询原摘要；原质押只读脚本的已知集合已扩充为这两笔，未允许未知记录或跳过未决记录。

Webpack 43990ms、四入口静态审计通过。最终后台 SHA256 `3a85161e43e83c72be22dc6808dd20feea7b021ad3605c65bf31d7e45263eb10`；UI SHA256 `9601f6ee38696c6527d162932030d5777cfc4607e85299e1037aaf5eaa28aa62`。提交前、重启后 CDP 读取实际 worker 源码均与磁盘一致。业务验证为 38 项相关测试和实际链路，不声称本轮重跑全部测试。

新产物第一次加载旧档案时仍发生重载阻断：dApp 只读审计首次 ERR_BLOCKED_BY_CLIENT，后续只读重试成功。测试工具增加仅针对该瞬态错误的 4 次、每次 250ms 唤醒重试，并仍核验新 worker 源码；coin 的首次新产物启动也在粗粒度 admission 阶段失败（0 模拟0提交、无批准标记），无法仅凭旧日志确定具体子阶段。增加阶段诊断后成功运行使用的是启动即匹配的新 worker，不把该成功声称为 reload 分支已获真实验证。全部失败日志保留。

TRY-02 仍开放：普通创建账户路径与真实链失败等剩余门槛未完成；模拟拒绝不能冒充链上失败。本次补齐了钱包原生币实际执行与重启持久化证据。总体仍为 40/98，trial_ready=false。
