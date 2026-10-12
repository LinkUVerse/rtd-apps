# C30 dApp准备入口的持久互斥顺序修复

当前C29真实产品生成pending、旧context关闭、新worker锁定保留已经观察。诊断01 readonly admission-v1确认旧三角色identity ticket 9865a253-cd1a-4e96-9c18-04c1227b6476仍pending、capability-owner-v1无marker；这不是可安全认领的read ticket，禁止手工删除或伪造完成。coin02正面alert成立，coin01/03及诊断01没有全部通过，材料保留。

- [x] O1：仅dApp prepare请求，在本地账户/当前profile校验后、首次远程identity观察前，通过同一原生execution scope锁和真实journal做短preflight；真正构建前的完整guard与后续身份/权限/bytes复核保留。execute/recover和readOnly语义保持。
- [x] O2：有pending/已有request/锁竞争/存储失败时，验证零identity IO、零业务构建；无pending时仍fresh身份校验。验证账户变更和实际准备再次检查。
- [x] O3：当前完整相关测试/类型/独立C30生产编译/闭包，原C29与所有RTD source/debug/消费者保留。
- [x] O4：当前 C30 真实产品生成 pending 后，同一受控 profile 冷启动并正常 UI 解锁；pending 原记录不改，旧身份 ticket 不清理，新 dApp 的可信准备入口明确拒绝 durable pending；续测 0 模拟、0 签名动作、0 Execute，独立审核原模拟帧和三个 journal store。

此顺序修复不解除旧无owner身份观察；完整身份观察取消/冷恢复合同与全内部NFT/staking竞争矩阵仍开放，不能因此单独关闭TX-04或ENV-07。

O1–O3实际范围：[全测/类型及编译核验01](./20261006-C30-coding-verification-01.json)通过。首轮99相关测试1个旧options断言未更新而失败，修正后完整2595通过；非产品功能失败。O4 已由恢复续测 02 与独立审核 01 完成限定范围；12 次同请求 Busy 拒绝后第 13 次明确 durable-pending 拒绝。原审批等待失败仍保留，原私有签名次数未知，coinPendingVisible=false，完整 TX04 仍开放。
