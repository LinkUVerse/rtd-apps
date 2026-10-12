# C58：完整三cohort有限验证的物理环境

按C57实际字节码结论准备四个独立物理目标，供后续4／8／8／4有限三cohort对照。每轮有新的Docker project、default network、S3数据卷、HBase root、WAL和两ZK卷；不使用原HBase表或原命名卷。保留指定link-u-smart-contract部署蓝图的同一immutable镜像、HBase3／MinIO root／WAL、初始化脚本及mTLS代理。原秘密配置和证书只读引用，不更改系统CA，不输出秘密。

第一步仅生成和检查声明式compose，移除postgres及其初始化，保留S3、ZK、S3-init、HBase master、RegionServer、表初始化、网关及mTLS代理八个服务。S3／ZK不映射主机端口；仅mTLS代理预留loopback42260–42263。所有volume和network必须由新project生成，禁止external、固定旧name、container_name、network_mode或external_links。初始化服务也不能共享原卷；原物理容器不暂停或重启。

用Docker Compose config进行实际schema／依赖解析，输出含私有环境仅保存在自有0700目录的0600文件，公开报告仅保留SHA与scope。四个project／volume／network名不得与当前Docker对象冲突；解析成功不是实际启动、数据隔离或消费者等价证明。仅声明准备0服务动作／0SQL写入／0交易；原29／14、source／八debug及1015文件必须保持。

后续启动依S3→ZK→S3-init→master／RegionServer→表初始化→网关／mTLS顺序，必须核验实际新物理ID／挂载及原gateway.jar。同源最新debug消费者各有新SQL database、独立Rocks路径和新HBase端点，均require-published-watermark／last-checkpoint205。HBase与SQL有限进程必须自然exit0；Rocks服务须记录摄取完毕的4水位和其单独服务终止，不冒称自然有限exit。对照14表的完整规范业务cells、23SQL水位及27表、4Rocks索引业务和规范查询事实，忽略各轮新数据库身份差异需明确说明，不能忽略业务值。

8×3输入的共享24预算尚未获得原16guard和12adapter资格，故启动消费者之前还须实现并审核新独立传输容量、PG总连接预算和全部原拒绝／实时事实检查。C55短SQL样本不替代这些步骤。新项目只在确实退役后按精确ID正常停止／删除容器，保留卷和数据；任何失败不重启、不重播原有限任务或业务交易。

H58-1声明式物理scope准备。H58-2实际隔离和新容量资格。H58-3完整三cohort有限终态与数据等价。H58-4精确收尾及完整资格后部署、持续追平和父验收。声明式准备完成时仅勾H58-1，其他保持开放。
