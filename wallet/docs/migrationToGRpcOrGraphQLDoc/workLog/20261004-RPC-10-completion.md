# RPC-10 系统／epoch／验证者合同核验（2026-10-04）

RPC-10接口与现有消费者接入完成。RPC-11／12／13的仓位、奖励／APY和实际质押提交仍按各自合同继续验收，不由本项代替。

## 当前实现

readStaking在一个准入S内读取0x5 wrapper，再按u64版本键读取RtdSystemStateInner V1／V2；拒绝未知版本、UID／类型／共享owner错误、内部system_state_version不符和BCS尾随字节。不把Epoch.systemState的epoch-start状态冒充S的当前状态。

epoch、protocolVersion、referenceGasPrice、safeMode、epoch起始时间／时长、总质押与active验证者来自同一系统BCS。inactive表、validator wrapper与内层BCS逐项校验；数量、重复pool、commission、deactivation和risk索引不一致拒绝，分页及末尾proof成立后才返回。

useStakingView与验证者列表、ValidatorLogo、质押／赎回详情、资产质押汇总和收据页均已消费WalletStakingView。执行准备另从Fullnode读取当前0x5 Shared引用，不把GraphQL快照对象送入交易；Fullnode.currentEpoch／checkpoint由同H0 service-info实时读取。最终构建gas／执行可行性由正式Fullnode模拟校验。

## 本轮真实证据

20261004-live-staking-fresh-funds.json使用明确当前本地Fullnode39400与认证GraphQL39600/graphql，同H0开发链：S=20844、epoch=2、protocolVersion=138、referenceGasPrice=1000、safeMode=false、总质押20000000002000000，一个验证者。当前新测试账户在该快照没有仓位，不将其当作非空仓位验收。

真实prepareStaking再次读取Fullnode新鲜总余额与共享系统对象，构建1000000000原子单位质押，gasBudget=4419224，固定bytes复模拟成功；未签名／提交。测试账户为此前独立地址资金fixture新建的账户，不重发旧pending交易。该证据证明近期余额接入实际准备器可用，不证明纯地址余额质押执行。

## 验证与边界

现行staking-reader测试18项覆盖V1／V2、active／inactive组合、错误拒绝、分页、会话与proof、BCS精确性；最近20261004-dynamic-child-tests.log中的98项相关测试包含全部18项并通过，配套完整钱包类型检查通过。V1／V2与Rust布局对照来自既有固定向量及当时debug验证日志，当前测试读取该对照，没有重新编译Rust。

本轮Mac仍锁定，cua明确无法操作Chrome；没有绕过锁屏或声称浏览器验收成功。NET-10旧Kit／Kiosk消费者、Chrome试用及其它剩余任务继续保留。
