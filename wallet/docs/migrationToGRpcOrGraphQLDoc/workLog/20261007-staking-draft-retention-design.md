# 质押读取重准入期间保留金额草稿

当前 C42 live Chrome01/02均未进入模拟／签名／执行，失败证据保留。第二轮两个表单文本已恢复，但等待两Review同时ready超时。源码确认：`StakingSession.amount` 仅在成功 prepare 后更新；Formik 在正常 pending/loading 条件下被卸载，用户先填写的金额无法从父级草稿恢复。

- [x] A1：回归复现已填写金额在相同账户／路由／会话读pending后的丢失，生产代码修复前测试失败；同时覆盖重新读取成功和账户／会话／路由换代清空。
- [x] A2：金额只作为用户输入草稿随Formik变化保留在既有 `StakingSession` 生命周期内；读失败时不得准备、模拟或执行；原审批 lifetime／bytes／gas、pending恢复及账户／会话 key保持。
- [x] A3：相关质押／赎回与授权边界测试、类型检查和实际生产新构建／闭包／源码差异独立审核。原C42产物和profile保持，不把新源码与旧构建混用。
- [x] A4：新构建实际origin与三入口身份核验，真实同scope锁下质押／赎回完整表单、金额1→2规范预览、原pending只读恢复和写后读继续独立取证。

先完成已经启动的 C42 pending 只读续验及独立审核，再改产品源码，避免破坏其输入SHA。本修复不修改RTD源码／debug产物、当前28个容器、共同窗口、任何水位或journal，不放宽503/504准入。

实际[修复前01](./20261007-staking-draft-tests-before-01.json)仅两项 pending/error 草稿断言失败、23项通过；[修复后01](./20261007-staking-draft-tests-after-01.json)25/25及[边界02](./20261007-staking-draft-boundaries-tests-after-02.json)47/47、[生产类型01](./20261007-staking-draft-typecheck-01.json)通过。只新增Formik金额观察到既有keyed生命周期，不持久化草稿、预览或恢复状态。金额1/2仍需重新正式prepare，账户／read session／binding／路由变化清空。

[C43构建01](./20261007-default-generation-positive-C43-build-01.json)0错误／2条既有warning，1119源SHA f489a51f...；[闭包01](./20261007-default-generation-positive-C43-audit-01.json)5285模块／2036源码／7chunks通过。[差异01](./20261007-C43-staking-draft-delta-audit-01.json)逐项复原原C42完整1119 hash、两个原文件完整事前备份、全部旧新产物SHA保持，唯一运行叶StakingCard.tsx；原Background/SDK/其他业务模块无运行源码差异。新[C43来源测量01](./20261007-positive-C43-origin-probe-01.json)实际UI/worker字节、五已知origin权限与未知端口拒绝、注册前真实403成立；实际来源bdndjiekaedpfbbndoefomeaeccaohgg。A4真实新来源注册／服务探测与业务矩阵继续，不把构建算为试用完成。

A4后续已由当前 [M4跨证据收口01](./20261007-C43-staking-matrix-completion-audit-01.json) 完成：78来源规则／12同H0、两live竞争、金额1／2和原赎回八正式模拟、两个durable冷恢复、原332734回执实际indexed刷新全部按当前源码／产物／账户／scope／完整journal关联，原live及冷profile已关闭。原失败与缺失读取body、503/504保持；本修复子合同完成，不代表全部98父项或持续可用。
