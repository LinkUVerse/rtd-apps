# C38 NFT原派发结果的界面生命周期

C37实际direct交易与journal均成功但自动导航失败，原因仍需独立诊断。代码审阅发现表单恢复effect依赖资产状态`rpc.state`，即使binding/account/readSession不变，资产snapshot重新准入的initializing也会取消界面等待。以实际能力边界补回归，不能用等待加长掩盖问题。

- [x] L1：原已派发期间configured→initializing→configured、Fullnode会话仍有效，禁止再次恢复/构建/派发，原结果应到原收据；先在旧实现记录失败。
- [x] L2：恢复effect只依赖原Fullnode会话生存；prepare/批准仍要求完整configured和所有原资格复核。原profile/account/readSession变化或Fullnode失效必须退役迟到结果。
- [x] L3：全部相关测试、两类型、全量、独立新production完整闭包，当前源码新版本和原C37证据分别保留。
- [ ] L4：新版本实际测量Origin、严格入口、真实NFT单次执行/原签名/journal/自动收据及真实索引延迟，完成后才考虑父合同。不得重复C37已经成功的NFT发送。

旧实现before01实际13通过/1失败：同一原Fullnode会话资产initializing导致恢复重复，原收据丢失。修改后after01实际118通过，原账户/session失效与迟到拒绝保持；两类型exit0和全量2627通过。Coin/Stake已使用独立生命周期/派发中守卫，未因本NFT修复改动这些不同实现。当前独立生产构建仍待终态。

L3完整终态：118定向、2627全量、两类型exit0、独立production/完整闭包通过，1118文件SHA c2ba4f22e827f8be13d5b2d37074b9e3396c14a0a9a9b43adb84be3089397c28。新实测Origin nbhademppohlgeodmnnkkjpikeekgbpm，加入前403/五权限contained/未知41999false；registration01只替owned C37 loopback，六旧Origin和Account TLS保留、保护进程0信号。新单次实链执行和边界审核继续独立验证。
