# C27：实际刷新空白修复与准入生命周期问题

当前源码 1,111 文件 SHA `fa8728c6e7f1e745a78691d5d904198ef10707b54d591a3e2a26b736163d2591`，仅修改余额 Hook、资产首页及中英文提示四个原文件，新增六项 Hook 测试。C26 [全部原源码快照](./20261006-C26-before-cold-read-ui-01.json)、两份生产包和四个失败 settings profile 保留。

disabled query 的 pending/idle 不等于正在发请求。C27 单独返回 readBlocked，资产页先展示本地账户及校验提示；普通余额加载期间也不隐藏账户卡片。余额／snapshot 的原撤值、query key、并发／读取／重试政策不变，未变动安全门禁、准入存储或交易链路。

[完整 182 文件／2568 项](./20261006-C27-full-unit-01.log)、[完整类型](./20261006-C27-types-01.log)、[生产构建](./20261006-C27-name-production-build-01.json)、[全闭包](./20261006-C27-name-production-audit-01.json)以及[21 项真实设置／刷新／锁定重启](./20261006-C27-current-settings-ui-01.json)通过。[实际 Chrome 入口观察](./20261006-C27-name-production-chrome-02.json)为四角色 HTTP200、其中 Fullnode／GraphQL／archive 同 H0；账户服务未取得有效同 H0 coverage，networkIdentityAccepted=false，不能记为四入口准入。[后续独立Chrome03](./20261006-C27-name-production-chrome-03.json)取得四HTTP200／同H0、0页面错误／外部／禁止请求／CA变更，02原观察仍保留。入口由独立 HTTP loopback [保留 9 旧 Origin 的新绑定](./20261006-C27-name-loopback-origin-01.json)支持，不改变 CA 或原 HTTPS 服务；未接受完整普通 HTTPS。构建有两项已有打包 warning，非零编译错误为 0。

此前三个只读诊断均运行在原失败 profile 的字节副本，原文件保持。[原生只读记录](./20261006-current-settings-native-admission-01.json)证实 admission 中有一个覆盖 24 区域的 pending、faults 空；egress context pending 空，egress ticket 为 0。它仍阻止全部业务读取。C27 修复本地控制可见性，没有清除此记录，也没有修复观察任务被页面销毁后的持久恢复。下一批必须为读取观察增加可证明的原生所有权终止与恢复，不能以超时或数据库清空绕过门禁。

总计仍 **78/98、trial_ready=false**。QA-A17／QA-A22 仅增加上述有限子项，NFT／隐藏资产及完整浏览器故障合同继续开放。
