# C28：读取观察的原生所有权与页面退出恢复

归属 QA-A17／QA-A20。C27只修复账户卡片可见性；实际 reload 留下的原生 pending 继续拦截读取。不能以等待时间、没有活动 HTTP 或普通锁状态快照推断旧观察完成。

权威依据：[Web Locks 2.4／2.6／request](https://w3c.github.io/web-locks/)规定回调 waiting promise 决定持锁生命周期，document unload cleanup 及 agent 终止释放剩余锁。`ifAvailable` 由原生锁管理器决定当时是否可授予；`query()`只是瞬时快照，不作为恢复依据。实现仍必须在实际 Chrome 中证明页面销毁、活跃迟到原始响应及保留浏览器重启，不以规范本身代替运行证据。

- [x] O1 v3 独立数据库增加 capability-owner-v1，v1／v2原 admission、egress记录不重写；只为读取能力观察原子写入 pending＋原生持锁标记。普通交易观察旧合同保持。
- [x] O2 每票独立随机 UUID 锁先取得再写 reservation，持有直到原始响应及物理清理完成或成功 durable completion；不使用 TTL、steal 或 query snapshot。
- [x] O3 后继只能在取得同一票独占锁后原子接管有明确本协议标记的原票；接管时 pending 不删除、faults不清空，重新执行生产身份／能力观察。原无标记 pending、活跃票、错误 binding／area／marker保持拒绝。
- [x] O4 完成时原票／marker原子校验与删除，所有已记录负面合并保留；接管后瞬时空失败不解除原 pending，已结束的旧 owner不能继续提交。
- [x] O5 生命周期定向／全量／完整类型／v1-v2升级、原生两页面活跃锁拒绝、真实 reload 与关闭重启恢复、迟到错链及损坏marker拒绝。新的production审核和当前来源必须跟随变更重新验证。

旧 C26/C27 失败profile、无标记 pending和原密钥／journal不修改；不自动将旧未知观察视为成功。此恢复只接管本协议的读取观察，不提供交易授权或清除交易 pending。

已完成的是上述有限子合同。实际production同票重启13项及reload9项的不同生命周期分别审核，详见[完整本批日志](./20261006-C28-observation-owner-completion.md)；任意断电/BFCache和全QA-A17/20仍开放。
