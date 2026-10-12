# C43 新 profile 的严格 pending 与质押只读续验

新 unpacked 来源变化，C42 原 DEFM profile／journal不复制、不改写、不清空，也不打开原历史执行profile。C42 D1–D4仍只属于原源码版本。

- [x] P1：C43当前源／构建／十二来源规则和真实共同窗口、原受控owner／native NFT／Gas先核验；新私有profile正常导入／密码保护，唯一小额同账户1原子单位、gasBudget102000008原None交易，固定与原DEFM不同摘要。
- [x] P2：一次真实产品批准生成签名执行尝试，在浏览器精确路由截断并本地核验原批准bytes／owner签名，0网络转发，产品自然记录严格pending。creator只执行一次，不注入journal。
- [x] P3：原新owner context／worker真实关闭，正常冷启动／解锁／native锁free下直接NFT入口只能恢复原新摘要，0竞争模拟／签名／派发，三store和密文保持／重锁／自然关闭，独立原帧／native核验。
- [x] P4：同一新profile只读冷打开原332734 indexed赎回及正确验证者质押入口，两个都只恢复原新摘要；禁止任何新Simulate／VerifySignature／Execute，当前S／三store／密文、observer退出／native锁free／正常重锁关闭独立审核。

新creator完成后即保护该profile和摘要，后续只允许本计划的M4只读续验，不重跑creator、不重发、不给网络转发。原缺失NOT_FOUND body和503/504保留，普通Chrome TLS、真实赎回、全Kiosk及父项保持开放。工具准备和语法检查不能预勾实际子项。

实际 [creator Chrome01](./20261007-C43-direct-NFT-retained-pending-chrome-01.json) 19项与 [独立01](./20261007-C43-direct-NFT-retained-pending-independent-01.json) 均通过。唯一摘要BMWQQ6WChyYemAcKWRdMMLiTy8anJiZBYbWtQwcs1o8r；两个完整ENABLED模拟、原生及本地原签名核验、精确批准bytes／gas102000008成立，唯一Execute尝试被截断且0转发。新profile `dev-20261006-03/current-C43-direct-NFT-pending-20261007-01/profile`、私有密码与原三store保护，绝不重跑创建器。独立fresh NFT／gas规范对象和真实S348630／typed摘要核验通过，六原NOT_FOUND body缺失保留，不补造、不声称完整原body。P4只读续验已启动，待实际完整与独立通过。

P4后续实际 [质押／赎回 Chrome01](./20261007-C43-staking-retained-pending-chrome-01.json) 15项与 [独立01](./20261007-C43-staking-retained-pending-independent-01.json) 均通过：两个实际表单仅恢复原BMWQ摘要，S349358／完整当前资产上下文与typed摘要、原332734规范仓位／系统共享对象独立核验，真实native锁free不能绕过durable pending；三store、原密文、observer退出、重锁和Chrome关闭保持。零新Simulate／VerifySignature／Execute，八原NOT_FOUND读取body缺失保留。创建器未重跑，没有复制C42或清空任何journal。
