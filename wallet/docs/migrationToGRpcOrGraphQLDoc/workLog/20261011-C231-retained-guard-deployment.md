# C231：保留重放独立守卫已部署

保留重放的只读适配器已切换到独立mTLS守卫。三类消费者仍各1并发、适配器仍4许可，debug产物、固定0..709569范围及全部逐对象校验不变。此前约1 checkpoint/秒的重放，本轮部署后连续62.019秒实测达到每类3.209–3.225 checkpoint/秒。

这是已经部署后的实际摄取表现；此前C230只读压测的12.82组/秒不是这里的生产摄取指标，也不作为98项全部验收完成依据。没有修改钱包生产代码，普通Chrome仍为C227。

## 部署及权限边界

- 独立守卫：`rtd-wallet-c231-retained-read-guard`，仅loopback `127.0.0.1:42990`，镜像与原守卫相同，2GiB内存/2CPU硬限制且不扩张swap。
- 原主查询守卫41890、原链、原发布器、主查询服务及保留重放的writer/indexer/consistent均未重启或收到信号。
- 保留适配器仍监听42891。旧PID16912已退出，新PID65516使用 `C231-retained-isolated-guard-20261011-01/adapter`；只改变后端guardUrl至 `https://127.0.0.1:42990`，代码、证书、许可和对消费者端口保持。
- 相同只读挂载、身份、TLS、源/副本/版本/账本核验、只读根文件系统、cap-drop和no-new-privileges保持；不缓存准入或checkpoint，不增加业务读取重试。
- 测试用临时适配器已停止，前两次失败产生的守卫容器均已删除。最终守卫正在承担重放读取，继续保留；共享镜像未删除。

[准备证明](./20261011-C231-retained-guard-prepared-01.json)和[第三次部署结果](./20261011-C231-retained-guard-applied-03.json)包含完整输入摘要及实际进程/容器身份。部署前分别通过独立守卫和临时适配器的marker、genesis checkpoint、既有内部checkpoint正例，未支持路径与任意version参数返回404，缺客户端证书被TLS拒绝。切换后同样的三正例/两反例再次通过。

运行范围验证由C223逐项显式派生，原116容器与35个未替换进程继续验证，新守卫及适配器另行验证；只有已验证的新适配器记录及新增容器计数可用于历史比较转换，返回的当前scope仍含真实新身份。旧进程记录和旧校验脚本没有覆写。[5项范围测试](./20261011-C231-scope-tests-01.log)证明未批准的进程、额外容器、来源和入口变化不会被转换掩盖。

## 两次启动失败与切换暂态

第一轮以TCP端口开放作为就绪条件，Docker转发已开放但TLS服务尚未就绪，出现TLS EOF；在原适配器交接前自动清理。第二轮的认证`/live`及守卫验证通过，但部署脚本漏建临时进程父目录；同样在原适配器交接前清理。两轮原环境均恢复完整校验，没有伪装成安装成功。[第一轮日志](./20261011-C231-retained-guard-applied-01.log)、[第二轮日志](./20261011-C231-retained-guard-applied-02.log)保留。

第三轮补齐私有进程目录，启动时先用带证书的`/live`验证就绪；这只作用于新服务启动，不重试业务读取。正式交接时旧只读适配器收到一次SIGTERM；writer、indexer、consistent各记录一条连接提前结束的警告，分别涉及checkpoint223713/223713/223714，随后依靠原有摄取恢复机制继续前进。[切换日志观察](./20261011-C231-cutover-log-observation-01.json)保留这三条暂态，不将切换描述成零中断。

## 部署后实际表现

[三窗口完整指标](./20261011-C231-retained-performance-01.json)为被动采集，不向checkpoint源增加压测请求：

| 消费者 | 62.019秒平均checkpoint/秒 | 该观察窗口新增重试 |
| --- | ---: | ---: |
| 保留HBase writer | 3.225 | 0 |
| 保留SQL indexer | 3.225 | 0 |
| 保留Consistent | 3.209 | 0 |
| 主查询HBase writer | 4.579 | 0 |
| 主查询SQL indexer | 4.579 | 0 |
| 主查询Consistent | 4.547 | 0 |

此前C225/C230约1 checkpoint/秒为早先窗口，不能视为同时进行的严格对照，也不能据此承诺全天吞吐。当前配置的实际提速已得到摄取增量和持久水位支持；持续全范围、故障恢复和当前浏览器全部页面的验收仍独立保留。

[41条持久水位](./20261011-C231-retained-all41-watermarks-01.json)使用原只读SQL/TLS、HBase物理读取和RocksDB secondary；仅将运行范围入口改为C231，[精确派生证明](./20261011-C231-watermark-derivation-01.json)另存。最低checkpoint224101，覆盖计数224102/709570，数据进度31.5828%；Consistent实际AvailableRange为12686..224102。没有把摄取gauge冒充持久完成，也没有将数据进度计入父项完成率。

## 后续操作入口

当前运行检查使用 `link-u-smart-contract/all-in-one-deploy/localDeploy/capture_wallet_C231_current_query_scope.py`。旧C223入口仍绑定旧适配器及116容器，遇到本次显式变化应拒绝，不能通过改旧记录消除拒绝。

当前持久水位探针为 `probe_wallet_C231_retained_persisted_watermarks.py`，性能观察为 `observe_wallet_C231_retained_performance.py`。后续环境恢复须按新守卫→新适配器→既有消费者的依赖关系核对，不要同时启动旧42891适配器；本轮未执行整套冷启动，也没有取得原发布器安全交接终态。

P231四子项完成，仅限本轮只读路由分离和部署观察。完整父项仍93/98、剩余5.10%；P227-3非空普通Chrome验收及QA-A15/17/20、REL-02/05继续开放。
