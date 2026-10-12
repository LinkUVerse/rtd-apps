# 重启后账户连续根与查询窗口桥接

原独立token/capability完整根到67667，consistent冷恢复窗口从75097开始；原在线worker每批最多1000，第一批68667低于公开窗口，按现有合同应拒绝。不能启动后把错误日志当正常，也不能增大在线批次、删除旧根或手改水位。

- [x] E1：只读核验原两个sealed根、完整父payload、来源/debug/worker配置、真实公开75097检查点及正式发布；原worker仍不启动。
- [x] E2：独立有界一次性连续增量67668–75097（7430份），保留原parent和完整认证状态。分批每批≤1000读取/复核正式SQL与latest HEAD，原有限回放的固定版本字节再逐份验SHA；原生当前源码优化debug producer重新验证quorum/连续性/对象，原生输出逐checkpoint与正式SQL比对，最终公开75097 digest复核。按原最小权限角色分别原子导入增量，不改原sealed根、publication ACL/epoch/pending、reader配置或在线worker的batch1000限制。
- [x] E3：两个新sealed head都到75097后，独立核对真实reader交集、Personal/OwnerToken非空历史及原入口；再按原受控命令启动新两个bounded worker，证明至少一次自然提交/追平及来源保持。各提交单独保存receipt；一个成功不覆盖另一个失败。

桥接是保留谱系的认证增量初始化，公开窗口内的最后检查点必须来自真实生产GraphQL。中间7430份不是声称曾逐份处于当前公开projection窗口，依靠原sealed父的可信状态、逐份quorum连续认证及正式固定版本发布证明；此范围在结果中明确记录。A6仍须后验，不以产物生成代替数据库提交或worker推进。


E3后验：C36 public-owner-personal-history01实际15页／15原生回执，53967 OwnerToken原Kiosk与71849 Personal capability来源非空；四角色01／三个API independent-audit01均通过。原两根字节保持，新两个worker在受控重绑后各42／38次自然提交由独立SQL payload审核，不覆盖完整转移或父任务。
