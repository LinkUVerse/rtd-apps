# C55：有限debug消费者4／8并发对照

本合同先于编码和SQL／临时服务操作。C54同transport128真实读只提升约12.8%，未达到原1.20准备门；未安装。下一步检查原生消费者固定并发预算的作用，不降低校验或改变原三cohort。

使用当前封存source的debug rtd-indexer-alt，每轮仅处理0–205，且必须携带require-published-watermark和last-checkpoint205。四轮4／8／8／4，除ingestion固定并发与各自新的私有database、metrics身份外，原indexer配置全部保持。原4以内预算工具不修改，也不把更高并发写入它的既有manifest。

两个隔离guard均为实际已安装的同一个immutable image、原环境／用户／只读挂载和网络；不改Handler、SQL pool、CHECKS或业务源码。分别通过自有loopback proxy只委托原consumer_proxy.fetch进行原mTLS读取。实验proxy并发4／8均不超过各自guard的16槽位；与原adapter分离。临时guard ports42207／42208、proxy42217／42218、单实验metrics42219；所有端口先确认空闲。每轮只运行一个新indexer，不接入原HBase／Rocks／account，不签名或发布。

新database／writer／readonly reader仅使用原已审核provision算法的新注册名和新scope身份，保留角色及权限约束。四轮各自自然退出后，23持久SQL水位必须全部205；使用各自readonly reader逐表比较27张业务表的完整规范JSON与原已认证205数据库，保留行数和规范摘要，不以只看水位替代业务等价。时间含实际启动／摄取／退出，所有原指标及错误保留；即使有限样本提速，也不推定完整三cohort持续追平。

原29／14、两个core、原publisher、source／八debug、1015保护文件和唯一C52观察器保持。实验HTTP请求会增加暂时负载，记录此限制。结束后仅关闭自有proxy，并对两个准确自有guard发正常SIGINT等待实际退出后非force删除。有限indexer若超时，只给精确自有PID正常SIGTERM并等待，不能强杀、重启或冒称exit0；未退出者保留身份和诊断。四个database与输出数据保留，不删除原数据／卷／镜像。

F55-1／2／3属于有限SQL验证，F55-4仍要求完整三cohort资源预算、HBase／Rocks等价、真实生命周期与新运行权威。不得让C52旧PLAN失效或在原working batch上操作。524022七覆盖、当前名称和Chrome验收仍按原合同执行。
