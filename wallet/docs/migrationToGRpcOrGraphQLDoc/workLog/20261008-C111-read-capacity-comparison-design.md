# C111 完整读取的四线程容量对照

先保留[原16线程ABBA](./20261008-C111-published-read-ABBA-01.json)与[完整独立审核](./20261008-C111-published-read-independent-01.json)：原7.284481秒、候选7.866238秒，中位比例0.926044，未满足原1.20性能门，未安装。B1为5.682469秒、B2为10.050007秒，这只证明本次时序波动，不能据此认定服务争用根因，也不能删除B2或重算通过。

新对照在编码前保存。另存C111 candidate02及ABBA02，仅将published读取固定workers由16改为4；stage仍原C105的16及全部原完整函数／固定VersionId GET／SHA／消费前fresh HEAD，所有SQL／复制／epoch／admission／replica／commit及14400预算均保持。原01文件、candidate01、全部原失败、当前工作C106父子不修改、不信号。

新候选须完整child／parent逆变换及真实两入口，原1／4／16对抗仍成立，另执行该candidate02真实整个循环的全部SQL／写回调／local及recorded_version／admission／epoch拒绝对照。随后用新operation在同256实际prepared七字段快照上做完整ABBA，原正式553728／pending709569／epoch1保持，完整body、TLS及SDK来源核对。沿用原1.20门；若失败继续拒绝采用，不提高预算或删除额外HEAD。所有结果只计该完整读取片段，不计正式提交或98父业务。

四线程是实现容量选择，最大仍在已验证1–16内，不改变查询／认证范围。只有满足真实性能及独立完整源码／原响应资格，才能按原P111-5自然终态／无child／lock0窗口另行交接；本轮工具没有安装权。下一阶段仍须真实709569正式提交及696489全部覆盖与完整NFT／名称验收。
