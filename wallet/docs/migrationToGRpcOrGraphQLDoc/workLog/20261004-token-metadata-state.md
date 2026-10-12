# RPC-04／07：发送页区分元数据缺失与读取失败

日期：2026-10-04。RPC-07补充消费端回归，RPC-04仍开放。

## 发现与变更

真实资产窗口已恢复，但当前S早于WMIG部署／注资。生产coinMetadata成功返回null，发送页此前显示通用“同步失败”；这把正常快照中的缺失与依赖失败混在一起。

SendTokenForm仅在未发生查询错误且data严格为null时显示明确精度缺失说明，中英文文案分别维护。金额和批准入口继续不可用，没有把未知decimals默认为0，没有借用Fullnode最新metadata拼接旧资产S。读取失败保持同步错误，合法decimals=0不受影响；单位展示与小数发送的原合同保持。双方SDK迁移方案追加相同说明。

新增测试专用metadata UI helper，通过原受控fixture的类型打开真实发送页面，捕获实际GraphQL成功-null响应，断言说明可见且不存在金额输入／Review／Send Now。生命周期脚本的新标志必须通过原非交易只读守卫，不能与模拟／执行标志混用，不注入查询结果或钱包数据库。

## 最终验证

- 完整钱包130文件1408项通过；完整钱包tsc退出0。token-metadata-state-full-tests.log／tsc.log。
- 开发Webpack成功45996ms；Provider及四入口AST／模块审计通过，分别保存webpack.log／provider-audit.json／wire-audit.json。
- 最终UI 9a5736d6b2c818ee370b5247ae25aef7d95fe71efca48699e9da5ed7469e2908，background ad6bd1c74ee9c6694efba03785a28b773c048cdf8b564b229e6bd2ee99fd2c06；四入口摘要在token-metadata-state-build-hashes.json。
- 两个JS脚本node --check通过。
- 真实Chrome成功：coinMetadata在S145612／digest5Z22yaL4aHAuSvvP3UbfRyfoDqkQXuWus4L77fKKGNQU为null，中文缺精度说明可见，金额输入／批准按钮不存在；同时再次通过10个非视觉资产、Kiosk卡片及空详情、私钥导入／密码／锁定解锁与整个浏览器重启，0模拟0广播。实际UI／worker摘要与磁盘一致，token-metadata-state-chrome.log。

未运行英文Chrome、依赖失败注入、正常CA／自定义权限或新币非零decimals发送验收。S145612仍早于种子400826和钱包发送409864，不把null当成当前币种或资金不存在。原WMIG余额500000 Coin与原摘要交易保持，未重发、未重跑种子或修改dev配置。总体48/98，trial_ready=false。
