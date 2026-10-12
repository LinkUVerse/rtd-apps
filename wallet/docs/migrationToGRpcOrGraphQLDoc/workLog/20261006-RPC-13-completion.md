# RPC-13 页面与实际核心链路完成

本次完成质押／赎回／验证者页面接入新领域模型及Fullnode系统交易合同，关联治理矩阵QA-A16一并验收。原98项父任务总数保持，完成后 **74/98**；trial_ready=false，剩余24项继续实施。原自动跳转失败、首次审计失败和旧测试记录全部保留，不将失败追记为成功。

[当前合同勾选前审计](./20261006-RPC-13-completion-audit-02.json)通过，固定 **C24 839da1f5f5b326bb06ccb0309703c37e1fe15699e391c9f93be3f2c34255f425／1110文件**，1151份完整相对路径输入保存，原生完整帧、签名、事件、余额和严格journal分别核验。原源码归档及全部原技术文档目录保留。执行环境再次核对当前RTD源码HEAD／diff及8份debug；只有link-u-smart-contract/localDeploy下的新脚本替换自有回环入口07→08并保留6个已实测origin，原服务和TLS信任未重启或修改。

## 页面与读取

[C23实际汇总、活跃详情、非法仓位拒绝、赎回确认及返回](./20261006-RPC-13-current-ui-04.json)12项、2次正式模拟、0Execute；[当前固定S完整领域与独立BCS／精确归档／奖励有理数](./20261006-RPC-13-current-domain-audit-01.json)验证原active本金1 RTD。新C24实际验证者列表／选择／金额输入及确认由下述完整一次质押覆盖。域读取使用固定S的GraphQL，构建、正式模拟、执行和近期确认使用Fullnode；没有JSON-RPC转发。

## 活跃赎回和非零收益兑付

[原C23一次活跃赎回原生审计](./20261006-RPC-13-current-native-01.json)摘要ERpYV3jhDNdN2mPpcYVykgdqmHQB6djC7M9JCfFPBh5m、cp978399／epoch4；本金1000000000、奖励46666663、净gas -132096、实际余额增加1046798759，原对象删除。负净gas来源于存储返还。S656532／epoch3估算0是较早索引事实，不替代epoch4兑付。最初[UI自动跳转失败](./20261006-RPC-13-current-execution-01.json)仍为false；[原同profile锁定恢复](./20261006-RPC-13-current-recovery-01.json)已确认成功、pending0、0新发送。

[C24原owner只读收据03](./20261006-RPC-13-current-receipt-03.json)17项通过，显示1 RTD本金、0.046666663 RTD奖励、+1.046798759 RTD余额变化，链成功和“资产数据仍在同步”并存；实际GraphQL覆盖仍低于目标cp。当前原profile未打开、空journal前后相同、0签名／模拟／执行、0页面异常／HTTP失败。此前随机旁观账户不显示本账户质押专用事件，以及02出现GraphQL503，均保留其失败／有限证据，不作为最终完整收据证明。

## C24实际质押与生命周期修复

修复同一binding／readSession的资产初始化错误取消在途执行结果的问题：[详细修复及旧失败](./20261006-RPC-13-active-withdrawal-progress.md)。保持账户／路由／网络会话变更中止旧结果、pending禁止重新预览、后台互斥和journal。新[实际验证者选择→1 RTD预览→一次批准→收据自动跳转](./20261006-RPC-13-current-add-execution-01.json)9项、4正式模拟、1签名／1Execute通过。摘要 **qmgejaJauqyEvkNhBitDG1F38SwXwmm5qYZeLyAggX3**，cp980199。

[精确新仓位原生审计02](./20261006-RPC-13-current-add-native-02.json)：新对象 **0x388d0bfbac8ce867c21766eda5ea015760b8e0550adc6cffec8c598f683b8dc4**，本金1000000000、激活epoch5、owner正确、系统事件和BCS一致；实际净扣款1001450984。driver保留的stakeId指原已赎回旧仓位，02明确分别记录stakeId=newStake.objectId和previouslyWithdrawnStakeId，01旧字段未覆盖。[原成功profile锁定重启](./20261006-RPC-13-current-add-recovery-01.json)保持同digest／effects／终态、pending0，0新签名／模拟／发送。新仓位在索引中尚未追平，当前不声称资产列表已经展示。

## 验证与范围

[治理定向12文件151项](./20261006-RPC-13-targeted-02.log)、[完整181文件2551项](./20261006-staking-lifetime-full-01.log)、[生产类型0诊断](./20261006-staking-lifetime-types-02.log)通过。[隔离production04](./20261006-personal-production-build-04.json)0error／2既有warning，[5277模块／2033源码／7JS闭包](./20261006-personal-production-audit-04.json)通过，实际UI／worker逐字节一致。C21 dist、ZIP、14安装指南保持历史，不冒充C24。

账户历史身份／覆盖本批仍有失败观测；普通Chrome原HTTPS信任、索引追上及全入口故障／发布包由剩余任务验收，不在本项完成声明中。多pool／inactive／safe-mode等使用生产reader的明确BCS夹具与算法／组件矩阵，详见[QA-A16](./20261006-QA-A16-completion.md)，不称真实开发链已切换全部治理状态。
