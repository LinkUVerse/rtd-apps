# RPC-13 质押列表与金额表单实测修复

## 已证实的问题

20261004-extension-staking-page-trace.log记录父账户仓位查询完成后又开始独立系统查询，第二轮请求在约19.9秒／42.4秒被取消，接着从父查询重新开始。页面每20秒刷新快照，串行重复读取使子列表始终无法完成。trace里的checkpoint字段匹配的是查询内首个checkpoint（包含genesis0），不能据其0值声称业务快照为0；本轮只使用请求顺序、完成和取消时序作为依据。

SelectValidatorCard现在可接收父页面已准入WalletStakingView，禁用重复系统查询；ValidatorListItem传给ValidatorLogo，仓位卡片／表单详情同样复用已有view。独立打开选择页仍正常发起自身查询；没有放宽快照／超时／身份准入。

列表修复后实际进入金额页，但出现“当前链账户正在签名或恢复”。StakingSession的effect在StrictMode重复挂载时，两次后台恢复可能互相争夺执行锁。现在同一页面会话通过ref共享尚未结束的只读恢复Promise，两个effect分别复核自身AbortSignal后才更新UI；完成后清空，可再次恢复。不共享提交，不撤销后台互斥，不清理journal。新增StrictMode回归证实只发起一次恢复且不执行交易。

## 最终验证

- 122文件1310项全量通过：20261004-staking-recovery-replay-full-tests.log。
- 钱包tsc退出0：20261004-staking-recovery-replay-typecheck.log。
- Local profile03/revision2开发构建46087ms成功；四入口静态审计通过。
- 实际Chromium 20261004-extension-staking-page-final.log退出0：无仓位测试账户真实GraphQL验证者列表1项，选中0xbff484df028a08ddddeec25f086ee08b1c79dc9e411a378fe1a92620f3bbded4进入匹配地址的金额表单；Fullnode新鲜余额接入，0金额禁用预览、1 RTD启用预览。未点击预览／批准，0模拟0提交。后续账户锁定、错误密码、正确密码及整浏览器重启通过。
- 最终ui.js SHA256 5e618783858660d38b80f5c452a15390dccdbddcd2ea8735955723302052acc1；background仍6e451aaea41dd3545141e8f0d8d5948cdac89273097cfa9d1183e69ea653c565，实际worker源码匹配。

## 失败保留与范围

此前页面失败日志全部保留。首次shared-view构建／tsc因新增React createElement测试类型推断报错，补显式props类型后最终通过；1309项是恢复检查修复之前结果，最终以1310项为准。

这证明实际列表与金额表单可用，不代表已执行质押、活跃仓位奖励、赎回页面或生产规模历史全部通过。仍使用新临时档案、编译Local和精确dev SPKI例外；保留执行档案与未知pending不动。RPC-13／TRY未提前勾选，总体40/98。
