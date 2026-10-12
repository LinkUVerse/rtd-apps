# 九个读取期限的生命周期修复与当前C13验证

完成[实施前设计](./20261005-identity-deadline-design.md)。identity、SDL、领域能力、native能力、部署声明、Move包、账户历史能力、GraphQL快照及账户历史协议使用由实际读取拥有的期限控制器；Promise结束后释放计时器。真实超时、外部取消、读后取消及未终结物理工作继续阻断授权，不清理既有pending或Fault。

原缺陷[实际复现](./20261005-identity-deadline-reproduction-01.log)为1失败／2通过；修复后3项新合同、360定向测试、170文件2382项完整回归与类型检查通过。DOM标准的[timeout定义](https://dom.spec.whatwg.org/#dom-abortsignal-timeout)没有业务Promise完成后自动撤销计时器的语义。九条路径的旧实现及两份受控期限测试原字节保留，重建C12产品SHA一致；[1082产品源码及149直接来源](./20261005-probe-deadline-source-inventory-01.json)冻结，[构建](./20261005-probe-deadline-build-01.json)稳定。UI4d5b159f、后台58709978；C12完整32产物保存，不覆盖此前失败证据。

[实际fresh Chrome启动](./20261005-probe-deadline-browser-01.json)加载UI及worker逐字匹配当前产物，四入口200／同H0，有限启动外部请求0、模拟／广播0、native pending0／fault0。[当前真实只签名](./20261005-probe-deadline-sign-only-01.json)完成3次checks-enabled Fullnode模拟、固定BCS与预览摘要匹配、SDK TransactionData Intent验签，Execute为0。该结果只覆盖内置SplitCoins／TransferObjects，不扩大到Move最终批准、全操作流量、normal CA、旧pending恢复或全钱包试用。

[原七journal01](./20261005-probe-deadline-original-journals-01.json)与之前逻辑SHA和实链effects一致，0模拟／广播；其核验入口曾打开业务UI，不能称全部存储无变化。本轮发现质押副本既有24范围pending1，保留[惰性只读结果](./20261005-probe-deadline-staking-copy-native-01.json)，不归因成已证实的单一原因。核验脚本随后改为manifest.json及admission前后SHA比较，原脚本[完整保留](./20261005-journal-auditor-ui-before.cjs.txt)。02核验因Fullnode RpcError失败，尚未产生成功结果，不虚报admission无变化。

质押副本页面在public-validator-list失败，私有profile与日志保留；fresh试探因前置02核验文件不存在失败，0模拟／广播，保留独立目录。四个服务端口均无监听、PID66145退出且Docker不可连接；已请求启动Docker，实际连续覆盖与bounded exit仍需只读核实，不重启回放或改水位。此前[0–366567覆盖](./20261005-probe-deadline-replay-01.json)为历史时间点证据。

[有限证据审计01](./20261005-probe-deadline-document-verification-01.json)已通过；当时尚未纳入后续只签名和02失败，范围以该输出为准。50/98、trial_ready=false，父NET-04／NET-11／TRY-06与完整质押仍开放。
