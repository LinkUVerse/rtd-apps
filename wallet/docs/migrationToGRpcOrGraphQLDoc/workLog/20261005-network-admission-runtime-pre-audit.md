# CAP6实际接入下一步只读审计

[F2b独立存储及原生26项](./20261005-network-admission-store.md)已收口；[本次12份实际来源SHA](./20261005-network-admission-runtime-pre-audit-01.json)保存，72份此前来源逐字不变。本页只是实施前审计，不把业务入口、cache或恢复门槛记成已编码。

## 必须保持的实际边界

1. identity.ts明确IdentityRole排除accountHistory，transaction-network-identity精确三入口report；network-capabilities通过独立accountHistory族检查其身份。接入持久记录时，三入口观察只声明自己实际观察的角色；已有accountHistory身份负面仍通过整个binding负面检查阻止新操作，不能假造第四个已验证bookend。
2. withExecutionAccount在signing且verifyTransactionNetwork非false时执行新鲜身份，等待后重复本地账户／网络／锁态校验。内部交易／dApp新签名由此复用，但只读旧摘要recover signing=false，dApp readOnly恢复也明确跳过该新交易门槛。新存储不得混进journal升级、恢复签名或Execute路径；仍须证明原scope与H0及0重发。
3. transaction-network-identity当前WeakMap只约束单session；旧NetworkObservations保存H0／generation水位reset，不能被新增完整binding记录替代。新存储必须先await原生占位提交后探测，再分类／完成；保存已知负面不能因session关闭被前置assertActive掩盖。普通失败只有当前操作失败，不能伪造错链；确实已settle的瞬时失败与完成存储失败／进程丢失须分别处理，后者留pending。
4. Provider使用共同session但balances／metadata／staking与NFT集合独立，assetReads避免慢资产分页被轮换取消。identity全binding撤值；schema／ABI领域撤值不能随意关闭共同session而同时撤掉健康balances。每个reader仍证明自己的快照，NC5只投影合同状态，不授权交易或共享跨domain的S。
5. history hook直接返回useQuery，当前失败可能保留此前data；save／hydrate的wallet-*过滤只阻止持久缓存，不撤内存旧值。必须以实际QueryClient与React测试证明disabled／error／切session／回相同binding均不冒作当前事实，且不误删其它binding／非链缓存。

## 接下来的编码顺序

- F2c.1：先将独立持久identity负面／pending检查接入现有后台三入口身份授权守卫，保留Fullnode有效而其它暂不可用的明确降级，缺IDB或提交失败不可退内存放行。观察前占位、IO settle后的首次决定、负面失败保守持久及最终检查分别测试，不能把一次读记录说成消灭最终发布竞争。
- F2c.2／F1c–d：协调本binding当前观察生命周期、消息仅作撤值通知后重读；Provider本session NC5与独立发布registry受控输入。必须审计同area并发的协调，不复制原ticket，不从UI报告给后台授权；实际schema／ABI门槛按各操作依赖逐项接入。
- F3／F2d／F4：所有Hook的旧data撤除、准确QueryClient取消／移除、原journal只读恢复反例、后台各新交易批准边界和最终发布竞争；最后新产品构建／真实核心Chrome与完整试用清单。

本批未操作RTD dev、原journal或受保护回放，未新增签名／模拟／Execute；只有隔离浏览器的F2b存储证明。下一次业务文件修改前保留各文件原字节，Task子项／workLog／totalProgress继续按实际验证更新，父49/98、trial_ready=false。
