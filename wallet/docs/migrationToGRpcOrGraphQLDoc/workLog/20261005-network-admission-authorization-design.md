# CAP6 F2c.1后台新交易身份授权持久准入设计

按[实际接入12来源审计](./20261005-network-admission-runtime-pre-audit.md)推进。编码前现有守卫／测试及后台夹具三份[原字节](../evidence/20261005-network-admission-authorization-before/manifest.json)及[当前状态](./20261005-current-state-before-network-admission-authorization.md)已保存；72份F2b来源逐字不变。此子项先连接实际后台守卫，不将它宣称为Provider／全部schema与ABI依赖／最终发布竞争已完成。

## 接入点与原合同

withExecutionAccount的signing新交易授权已调用assertTransactionNetworkIdentity，等待后再核验本地账户／profile／锁态。本轮在该真实守卫默认使用独立native WalletNetworkAdmissionStore，测试仅明确注入结构接口；不能让缺API退到内存放行。原三入口probeNetworkIdentity及Fullnode有效、其他临时不可用的显式降级保持，不伪造accountHistory正例；已有任一四角色身份负面／pending仍全binding阻止。领域schema／Move ABI依赖及四族能力状态由后续F1c–d／F2c.2逐入口接入。

原NetworkObservations先capture、后probe／observe的H0／generation水位reset保持，包括仅改revision不能解reset。独立准入begin只占本次实际配置的三角色，必须strict提交后再开始SDK身份IO。原signing=false摘要恢复和dApp readOnly分支继续沿原scope／H0读取，不改journal／执行协调器、不重新模拟签名或Execute。

## 完成、失败与取消

正常身份报告返回表示三角色任务已settle；校验report／Fullnode／高度和原水位提交后，用原ticket完成空Fault决定，再重读全binding负面并检查session，才返回身份结果。空决定只表示本次未产生有限Fault，不产生全网络ready。

真实NetworkIdentityError先在本session保存即刻拒绝状态，然后用同一原ticket提交分类Fault；session在等待落盘期间关闭，也不能让前置assertActive跳过已知负面写入。写失败保留原pending，返回固定存储失败；新实例不能补造正面。正常complete失败只尝试一次，catch不能自动第二次空决定清掉pending。

完全没开始probe，或probe正常返回后才发生的局部失败，可完成空Fault并拒绝本次操作。probe抛错／超时／取消可能早于abort-ignoring叶子settle，且session.read会在关闭时屏蔽原错误：无明确Fault时保留pending，迟到成功不自动清除，不伪造错链。真实Fault即使优先中断其它角色，也可以提交单调负面，因为后续正面不能清它。观察完成写失败／进程丢失永远不冒作已完成观察。

## 验证与剩余竞争

单测用实际SDK／protobuf／GraphQL身份夹具验证真实调用顺序、新session持续阻止、begin／complete失败、取消遗留、晚到持久负面、域独立与旧高度reset。存储模型只用于业务控制流，不能作native commit证明；另用隔离Chromium加载实际守卫、production native stores和公开SDK帧，验证默认后台存储连接、多实例／worker／浏览器正常重启、原生abort及0真实链／模拟／签名／Execute。

一次发布前读记录仍会与后来另一观察竞争；F2c.2的当前观察协调、跨context撤值通知后重读、完整授权／发布竞争及F3撤值必须继续。Provider共同session不能因单一Display／schema领域坏掉而整体关闭健康balances。本轮不宣称所有UI／后台入口或试用已验收；父49/98、trial_ready=false。
