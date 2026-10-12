# 当前C42质押与赎回的持久pending只读续验

实际[Chrome01](./20261007-C42-staking-retained-pending-chrome-01.json)及[独立01](./20261007-C42-staking-retained-pending-independent-01.json)通过15检查／两个真实入口：真实冷启动locked／正常解锁、原native锁free、S335071规范typed摘要及原332734 stake／V2系统fresh核验；两个入口只恢复原DEFM，0新模拟／签名／Execute，原三store／账户密文保持、正常退出观察／重锁／Chrome自然关闭。八个原GetTransaction的headers-only NOT_FOUND body未捕获，原请求／H0／高度／状态头保留，不声称全原body或持续可用。creator未重跑，原历史profile未打开。D1–D4完成限定C42子项，源码更改后的新构建还需单独验证，父项保持开放。

TX-04/M4限定子合同，84/98保持。沿用已经真实产品批准且未转发的**新**DEFM pending profile，只做明确计划的只读冷启动；原C39 pending和原成功执行profile继续保护。

- [x] D1：真实共同S>=332734及最新完整生产六依赖/十依赖仓位审核，当前C42源码/产物、原332734 stake/owner/principal/pool与新DEFM完整pending/密文匹配。不能在仓位未indexed时提前测完整赎回入口。
- [x] D2：相同新profile真实冷启动、正常密码解锁，实际native锁可用；当前正确验证者质押入口及唯一原332734赎回入口分别只恢复DEFM，禁止新审批。任何Simulate/VerifySignature/Execute均浏览器拦截并使测试失败。
- [x] D3：两个实际入口完整三store/密文不变，仅原DEFM GetTransaction查询；退出各恢复观察后native锁释放、正常重锁和自然Chrome关闭，0新签名/派发。
- [x] D4：独立当前UI/worker/输入SHA、两原路由/上下文、完整journal、canonical stake/系统及实际typed S、原请求与缺失body如实保留。原DEFM创建证据另属NFT P1–P4，续验不能重跑creator或重新执行。

新DEFM profile允许本计划的冷启动只读续验。未捕获NOT_FOUND原响应body不能补造为过去帧，fresh补充仅证明现在；普通Chrome TLS、全Kiosk live/durable及父项继续开放。实际仓位、live完整表单竞争、durable矩阵分别记录。

实施工具已准备：test-C42-staking-cold-durable-pending.cjs只允许已通过独立审核的新DEFM creator记录，读取既有密文profile并正常解锁，不再读取keystore或执行creator；Simulate/VerifySignature/Execute拦截记录为失败。audit-C42-staking-cold-durable-pending.cjs独立核对两原路由、上下文S>=332734、原journal/密文、请求和缺失NOT_FOUND body、当前产物及fresh canonical原stake/系统与typed S。与live v2／原仓位生产探针一起，[十项静态05](./20261007-C42-cold-pending-and-staking-tools-static-05.json)通过语法检查；真实D1–D4和完整M4均尚未运行，不据此勾选。
