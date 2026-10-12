# 2026-10-04：同一快照的Kiosk发现结果复用

OriginByte发现过程已经读取framework Kiosk对象，原内容读取又重复点查该对象。本批readFrameworkKioskContents增加受控复用入口，readOriginByteKiosks传入已发现对象。只允许snapshot对象与当前reader.proof为同一个引用；相同cacheKey文本不足以复用。复用仍校验objectId、framework type、Shared owner、精确BCS及UID，完整分页、动态field、NFT子对象wrapper所有权／类型／BCS、item_count、注册表／权限和终页snapshot revalidate保持。

未提高20秒集合预算；不交付部分集合，不回退JSON-RPC，不改变模拟／执行入口。新增8项用生产reader组合的非空Kiosk回归：点查只发生一次、子对象仍读取、两次最终revalidation、复制proof／错误UID／owner／type／objectId／wrapper以及预取消拒绝。

验证：3个定向测试文件63项通过；钱包全量131文件1416项通过，完整tsc无新增类型错误，开发Webpack成功；四入口provider与39种线方法静态闭包审计通过。日志：[定向](./20261004-kiosk-discovery-reuse-tests.log)、[全量](./20261004-kiosk-discovery-reuse-all-tests.log)、[tsc](./20261004-kiosk-discovery-reuse-tsc.log)、[Webpack](./20261004-kiosk-discovery-reuse-webpack.log)、[provider](./20261004-kiosk-discovery-reuse-provider-audit.log)、[wire](./20261004-kiosk-discovery-reuse-wire-audit.log)。

本批新UI SHA256为2eaddb81219d959737764c8fe58cbc010ae3077651af60dc4df213bdd532c76f，background为ef15ecc73480d6967afb44b5263d28f696c1b537d19bd0a2df09fdf92e28de44；content-script和dapp-interface摘要保持。静态闭包不替代动态网络／Chrome。

恢复前只读OriginByte探针在S159355的首个ownedObjects查询超时，3次GraphQL请求，未进入复用分支／新鲜对象比对／P2P指令构造；0模拟0广播，保留[失败JSON](./20261004-kiosk-discovery-reuse-live.json)。初次Chrome调用证书路径缺少publication-foundation，启动前失败；修正路径后Chrome在local profile asset query阶段超时，仍0模拟0广播：[初次](./20261004-kiosk-discovery-reuse-chrome.log)、[修正后](./20261004-kiosk-discovery-reuse-chrome-corrected.log)。这些失败均不得记为本次产物浏览器通过。

开发链已按[原摘要受控恢复](./20261004-original-summary-recovery.md)恢复；新状态下的OriginByte复核另保存结果，不覆盖以上失败或历史成功。RPC-22／23及trial_ready保持未完成，完整真实NFT转移和正常证书权限未验收。

恢复后在S163168再次失败于首个完整ownedObjects请求，3次GraphQL请求、20秒超时，0模拟0广播：[恢复后JSON](./20261004-kiosk-discovery-reuse-after-recovery.json)。进一步同S163619字段隔离：identity 2514ms、BCS／owner 3263ms、JSON／transfer 2118ms通过，display单独10003ms超时，未继续previousTransaction：[字段隔离](./20261004-owned-object-query-latency.json)。这不是完整资产交付。两类display SQL实际只读计划走既有索引，执行约1.9ms／9.7ms，不能归因为缺索引：[SQL计划](./20261004-display-sql-plans.json)。原生GraphQL同display查询10秒超时；公开端点初次诊断因profile字段路径错误未执行，修正结果另存，不能当作公开服务超时证据。后续定位display服务resolver／调度／pool。

公开端点字段路径已修正，S163619的同display查询仍10006ms超时，0模拟0广播：[公开端点实际记录](./20261004-display-endpoint-public-corrected.json)。原生和公开端点均超时，不能仅归因为入口代理；SQL计划低时延不排除服务连接池等待。Display v1按当前sum_displays读取、缺少S参数的官方合同差异已同步双方SDK章节，RPC-03／NET-04继续待完成。

2026-10-05修正：此前字面量单对象 SQL 不能代表实际 UNNEST／LATERAL；已验证全局 checkpoint 索引扫描与对象版本磁盘读取，并完成闭区间 ID＋联合排序改写。当前生产七键7.114ms／3项真实 PostgreSQL 回归／debug重编译通过；完整钱包查询仍被重启后共同S缺口拒绝，见[后续诊断与恢复](./20261005-query-range-recovery.md)。
