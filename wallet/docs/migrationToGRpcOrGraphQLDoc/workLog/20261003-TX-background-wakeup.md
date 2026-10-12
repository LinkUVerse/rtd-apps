# TX-07 后台只读恢复唤醒

日期：2026-10-03。

已新增 `src/background/execution-recovery-wakeup.ts` 并从 background 入口注册，选中账户恢复委托既有 `recoverWalletExecution`。事件覆盖 worker 求值、browser startup、Port 连接、切网／账户状态与一分钟 alarm。并发触发合并；当前查询失效后保留一次新作用域检查；失败不修改 journal。

这一步补齐自动调用，而不扩大执行授权。`recoverWalletExecution` 仍通过当前网络绑定与选中账户核验，允许锁定账户只读原摘要；没有 simulate／signData／dispatch 调用。无唯一选中账户时跳过。dApp pending 可由账户级协调器确认终态，不依赖已关闭的批准窗口；向 dApp 返回原签名仍由既有授权请求恢复命令单独处理。

## 验证

- 3 文件 30 项定向测试通过：[测试日志](./20261003-TX-wakeup-tests-final.log)。6 项新增触发／合并／异常恢复测试，既有 background 与协调器 24 项覆盖原摘要只读、锁定账户、签名／发送隔离等。
- 完整 TypeScript 退出码 0：[类型日志](./20261003-TX-wakeup-types-final.log)。
- 开发版 webpack 成功，20281ms：[构建日志](./20261003-TX-wakeup-build.log)。
- Chromium 153.0.8010.12 加载实际 dist，恢复 alarm 名称与一分钟周期正确，欢迎页与真实 Port 读取正常，pageErrors=[]：[扩展探测](./20261003-TX-wakeup-extension.json)。空账户配置，没有执行链交易。

官方语义和双份方案已同步。真实 pending 跨 worker 中止／重启、切网后原摘要恢复仍待端到端证明，TX-07 不勾，总体仍16/98。未以空账户启动探测代替核心试用验收。
