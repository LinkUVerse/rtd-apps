# C42 原 framework 转出后的当前写后读

从 G5 拆出当前 framework 的只读验收；不新增父任务，不重复原281963交易，不打开原执行profile。名称新鲜度及完整TX-08继续按原合同。

- [x] F1：在完成283000追赶和精确恢复后，取得当前 C42 十依赖与原生 consistent 的实际共同窗口，验证最新RTD debug、当前产品源和后继ownership。
- [x] F2：生产 WalletAssetReader 同S读取发送人原cap及现在为空的Kiosk、收款人全部拥有对象分页，原NFT归收款人，version/digest/contents/previousTransaction与新鲜Fullnode及精确版本archive一致；原摘要回执只读核验。
- [x] F3：独立原始GraphQL／native／archive报文、canonical对象／交易／effects、typed检查点和全分页结束核验；未捕获或拒绝的接口不认通过。
- [x] F4：当前C42正常新受控Chrome中验证收款NFT与详情、发送人空Kiosk显示／刷新，完整journal保持、重锁。仅F1–F3不能替代这一UI验收。

异常503保留，不以循环重试掩盖；没有模拟、签名或发送权限。保护原C39 pending及全部历史执行profile。

F1–F3实际[production02](./20261007-C42-framework-post-transfer-production-02.json)与[独立01](./20261007-C42-framework-post-transfer-independent-01.json)通过：S285257、29完整报文/20GraphQL/9RPC、收款人7对象三真实页、原cap与Kiosk canonical BCS/空dynamicFields、NFT native及精确archive原字节/owner/digest、原交易/签名和typed S摘要一致。原production01误将sourceKiosk结构当id而失败，0交易；独立工具最初两次误判ownedObjects节点层级，在写文件前失败，修正真实schema后独立01通过。F4新两角色Chrome工具首次语法检查指出route回调缺async，未启动Chrome，修正后再检查和执行；不算业务通过。

F4第一次两新受控profile执行均因关闭时route.fetch回调未处理TargetClosedError导致没有完整结果文件，整轮未认通过；原两数据目录保留、Chrome进程已退出。关闭采集错误现在显式留证并等候回调，增加独立公开进度与失败前落盘；之后使用全新02 profile，绝不重开原执行profile。

F4两角色02各观察到10项（含三store不变及正常重锁），但结束阶段unrouteAll wait阻塞。仅对两个已完成检查的新自有测试Chrome父进程做SIGTERM（身份/父Node/profile精确门槛；首次匹配到helper的审计拒绝、0信号），两profile保留且独立确认Chrome已退出。两个Node随后exit0却没有完整结果落盘，仍不能计F4通过。新03关闭前保存完整原观察，成功时不额外导航，unroute使用ignoreErrors，全部回调异常仍留证；不重开01/02或原执行profile。

F4最终两角色[收款03](./20261007-C42-framework-recipient-chrome-03.json)/[发送03](./20261007-C42-framework-sender-chrome-03.json)各10项、完整落盘且自然结束；[独立02](./20261007-C42-framework-ui-independent-02.json)通过20项、全部231采集帧/SHA、两实际S289172与S289200新鲜typed summary/contents。收款7对象/原NFT/card/details/返回刷新、发送原cap/空Kiosk/返回刷新、三空journal/正常重锁/自有Chrome退出成立。12实际503（GraphQL10、archive ServiceInfo2）及11closing采集取消保留，不宣称持续环境可用或背景帧全集。独立01忽略独立genesis checkpoint查询而失败，修正schema后02通过，未重跑03 Chrome。G5 framework部分完成，名称/全入口/TX08父项仍未完成。
