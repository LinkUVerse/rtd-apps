# CAP6 F2b独立strict准入存储与原生浏览器有限验证

本批按[F2b编码前设计](./20261005-network-admission-store-design.md)实现，先保存[当前状态原文](./20261005-current-state-before-network-admission-store.md)及核验前一批68份来源。代码、失败夹具与日志不覆盖历史证据，父计数49/98、trial_ready=false保持。

## 实现及用途

新增[production store](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/shared/rpc/network-admission-store.ts)提供capture／assertClear／begin／complete。唯一独立version1库、单admission-v1 keyPath bindingKey／无index／autoIncrement，构造options及操作profile／areas／Fault复制；仅默认命名空间及预算内test前缀可选，不会误选journal／NetworkObservations。

begin先strict事务重读并提交pending，transaction complete后才返回冻结原ticket；complete只有本实例原对象／原binding所有权，复制、其它实例／重启及不同binding均拒绝。首个有效完成决定在IO前复制并锁定；负面完成abort／ConstraintError仍只能相同负面重试，不能改为空决定。并发complete拒绝重复，完成成功删自身所有权；无清除／TTL／补造正面恢复接口。

事务内按当前行单调合并Fault，只完成自己的pending。identity负面／占位全binding，domain／Move组按依赖；assets／Display失败不阻止独立balances。capture／assertClear或完成成功不产生授权证书，最终身份／事实／发布重检与受控重绑、原height-reset及旧摘要只读恢复仍须接入层落实。

每次open及事务仅共用1–5000ms单调期限；blocked／error／abort／期限到达立即拒绝，尝试abort／关闭迟到db，迟到get／complete不发布或新写入。请求strict并检查属性，仅complete计成功，精确库和行损坏不自动修复。native已实际提交但complete回调迟到时，调用仍失败、pending保守阻止；这不是清除事务已提交内容的承诺。

## 实际验证

[最终检查摘要](./20261005-network-admission-store-checks-final-01.json)记录直接工具退出码及日志SHA。新增13项前置合同，三文件74项定向、完整160文件2225项钱包测试全部通过（完整72.27秒；无测试筛选，maxWorkers=2不改生产预算）。RPC、完整钱包及单独browser harness类型各实际0；四文件格式检查0。

[最终原生日志](./20261005-network-admission-store-native-03.log)26项全部通过；脚本加载[真实harness](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/tests/unit/rpc/network-admission-browser-harness.ts)／production store至临时Chromium profile。原生strict／request success与complete顺序、两个实例同area互斥、独立area负面合并、晚到identity及旧正面保留、输入mutation、scope／所有权／首次决定、同步完成竞争、未来版本／错误keyPath／index／extra store／autoIncrement／未知字段、relaxed降级、真实升级阻塞、open／get／complete迟到与一个总期限、ConstraintError均通过。独立第二页、实际service worker停止重启及整个Chromium正常关闭后同profile重启保持两个负面和一个pending；读出的ticket不能补造所有权。event pageError=0，external request attempt=0，链／模拟／签名／Execute各0。

这里只证明本地策略及合成公开输入下的原生事务／正常重启，未启动或操作真实钱包扩展／RTD dev／原journal／受保护Display回放；没有实链或新产品bundle／核心Chrome验收。[W3C固定工作草案](https://www.w3.org/TR/2025/WD-IndexedDB-3-20250813/#transaction-durability-hint)仍将strict定义为durability hint；不是物理断电或崩溃证明，原文沿用[既有固定SHA](../evidence/official/20261005-network-admission-state/manifest.json)。

## 首次失败与复验理由

[native01失败日志](./20261005-network-admission-store-native-01.log)原样保留，独立失败profile仍在日志给定路径。初次夹具把complete观察监听器注册在生产handler之后，错误假定它必先于Promise续体；因此commit计数失败。调整夹具在创建native事务时先注册监听器，再让production handler安装，生产代码未改。[原脚本字节及SHA](../evidence/20261005-network-admission-store-diagnostics/manifest.json)保留，避免只保留成功日志。

[native02](./20261005-network-admission-store-native-02.log)26项通过后，新增pageerror／外部请求attempt检查，确认异步事件断言异常不会被漏计；最终native03实际0。这次重验只补齐原生夹具断言证据，完整钱包测试针对不变的production／unit代码完成一次，无无理由反复扩大测试。

## 来源、双方文档与未完成工作

[当前来源清单](./20261005-network-admission-store-source-inventory-01.json)：68份前批来源SHA全部不变，四新份形成72份唯一当前来源；1062产品文件SHA `3cef7c74a37c4358bb8f43914777ed476c7fb6303e307fac49fbd545b34695a7`。历史C9磁盘bundle不变、未新build；SDK／RTD只读。20份既有原字节、F2a一份初始SDL夹具另有F2b一份初始native脚本诊断均保留。

本批双方06／05添加相同合同段；[完整文档与来源核验](./20261005-network-admission-store-document-verification-final-01.json)及[精确 verifier](./20261005-network-admission-store-document-verifier-01.py.txt)收口。F2b.1／F2b.2仅记编码／原生有限验证完成；F1c–d／F2c–d Provider与后台实际门槛、跨context通知后重读、最终发布竞争、F3完整旧值撤除、只读旧摘要恢复例外、F4核心Chrome仍开放。真实独立发布签认、全部业务余项与试用清单不升级，任务继续。
