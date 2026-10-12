# CAP6 F2b独立准入存储实施前设计

本批承接[F2a纯合同](./20261005-network-admission-state-design.md)，[更新前状态](./20261005-current-state-before-network-admission-store.md)及68份当前来源逐字核验已完成。先实现独立存储与隔离原生浏览器验证，再接Provider／后台，不能把本批结果记成整个钱包门槛已实施。

## 库、所有权与完成决定

默认新库`RtdWallet NetworkAdmission`，version1、唯一`admission-v1`、keyPath=`bindingKey`、无index／autoIncrement；测试命名仅允许`RtdWallet NetworkAdmission:test:`前缀，总名UTF8≤256字节，禁止误选journal／NetworkObservations库。options构造时复制，profile及areas在第一次await前复制校验；capture／assertClear只检查负面，空行或完成结果不是授权。

begin在同一native strict读写事务里重读当前值并reserve；只有transaction complete且总期限内才返回deep-frozen原ticket并记录私有WeakMap所有权。调用方必须先await begin才能开始观察IO。complete只接受该实例／binding发出的原对象；复制／反序列化／其它实例／重启不能补造所有权。先按原areas验证、复制、规范化首个有效Fault决定，随后锁定；写入失败仍只能用相同决定重试，不得把已知负面改为`[]`。同时完成拒绝，成功后删除该原对象所有权。失败、崩溃遗留pending无TTL／普通成功清除；受控重绑与原height-reset约束由接入层另验。

complete在事务内读当前行，合并Fault并只移除自身pending，不使用先前capture覆盖并发；identity负面全binding，领域／Move组保持依赖范围。即使完成成功也必须重新检查当前状态／实时身份／能力，最终发布竞争仍归F2c–d。

## 一个期限与异步事件

每次操作仅一个1–5000ms期限，performance.now单调时钟覆盖open和事务。超时／blocked／error立即拒绝，尝试abort，迟到open success关闭db；迟到get／complete不再转换、写入或发布成功。读写要求durability strict属性，put request success不算提交。精确version／store数量／keyPath／index／autoIncrement检查；未来库版本、形状破坏或行不兼容拒绝，非预期异常只返回固定存储失败，不带数据库内容／账户信息。

[W3C固定工作草案](https://www.w3.org/TR/2025/WD-IndexedDB-3-20250813/#transaction-durability-hint)的strict是durability hint；请求strict、检查属性并等待complete只证明本地接纳策略与浏览器事务行为，不证明物理断电持久性。原文固定SHA沿用[F2a来源清单](../evidence/official/20261005-network-admission-state/manifest.json)。

## 原生验证与边界

使用独立临时Chromium profile和127.0.0.1临时origin，只加载本地production store bundle与worker；阻止外部请求，不启动RTD／钱包扩展，不操作原journal或受保护回放。验证native strict与提交顺序、request成功后abort、完成决定锁定、不同绑定／实例／复制拒绝、caller mutation、并发保留／区域独立、损坏行／库、strict不支持、open阻塞／迟到、同一总期限、跨页／worker stop重启／整个浏览器正常关闭重启。故障注入委托真实IndexedDB，不能用假IDB替代原生提交；失败profile／日志保留。

F2b.1／F2b.2仅在实际代码、类型、钱包全量和原生结果验证后标记本批完成。F1c–d／F2c–d／F3业务接入、撤去旧数据、只读旧摘要恢复例外、全核心Chrome／试用仍开放，父任务不提前勾选。
