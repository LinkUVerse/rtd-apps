# RPC-13 实际质押确认页预览

新增RTD_TEST_STAKING_PREVIEW=1模式，在已有真实验证者选择和0／1金额校验基础上点击预览，不点击“立即质押”。实际公开测试账户通过Fullnode新鲜对象／余额读取和两次正式模拟进入确认页；验证者与URL选择一致，金额包含1000000000原子单位，gas与摘要可见，最终批准按钮可用，返回原金额表单成功。

最终证据20261004-extension-staking-preview-retry.log退出0，simulationRequests=2、dispatchRequests=0，后台账户生命周期和整浏览器重启验证通过。

- 验证者：0xbff484df028a08ddddeec25f086ee08b1c79dc9e411a378fe1a92620f3bbded4
- 交易摘要: zcxdgrU3Vgz4dKchtwCJ4tKre8xVoEjMhTjLWfz2Ved
- Gas 预算上限（MIST）: 4419224
- 原子金额：1000000000

首轮20261004-extension-staking-preview.log在账户导入页超时，未进入质押；进程退出后才重新启动临时档案测试，失败日志保留。没有清理或重用保留执行档案，没有任何签名提交。

此轮只变更测试脚本，业务代码和产物未变，沿用上一批1310项、tsc、构建及静态审计。仍是精确dev SPKI例外，不代表正常CA或主网；预览摘要不是链上交易成功证明。实际批准执行、journal恢复、非空活跃奖励及赎回Chrome仍待，因此RPC-13不勾选，40/98。
