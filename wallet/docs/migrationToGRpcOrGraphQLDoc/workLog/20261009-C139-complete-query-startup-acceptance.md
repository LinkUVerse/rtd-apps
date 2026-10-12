# C139完整查询重建启动和实际读取

本次继续优先完成一期非NFT查询与恢复，NFT业务专项后置。当前C136产品来源保持，未打开钱包profile、签名或链上广播。

全范围配置已经[准备](./20261009-C139-complete-query-consumers-prepared-01.json)并由[独立04](./20261009-C139-complete-query-consumers-preparation-independent-04.json)通过：23 SQL/Display、14 HBase、consistent八CF/四水位，真实sourceId和source generation保持，部署operation独立，全部消费者固定0–709569且仅从认证published guard读取。两个CSR收紧权限和使用本机已有OpenSSL3的修复及原失败均保留，未放宽证书链、用途、IP SAN或范围条件。

原启动01在完成独立数据库/两个最小权限角色和一个自有HBase代理后，因缺少自有processes父目录失败，三个消费者没有启动。[失败01](./20261009-C139-engine-start-failure-01.json)封存，原启动器不重跑。[接续02](./20261009-C139-existing-query-engines-started-02.json)复用实际已有目标，补建0700父目录后启动adapter及三个完整范围消费者；接续没有再次写SQL或创建容器。正确CA/client证书的HBase mTLS HTTP/2实际通过，checkpoint0完整字节SHA与原数据库只读提交版本一致。

[实际消费者独立01](./20261009-C139-actual-query-engines-independent-01.json)复核全部命令/出生身份/来源与原运行、固定范围、目标实际读权限和TLS。23 SQL初始水位最低110，14 HBase物理H0水位最低116，四consistent水位最低115；Display完整0–110覆盖/真实源绑定及所有实际public表只读权限成立。这些是当时的部分重放水位，不等于709569完成。

实际genesis/完整schema和consistent成立后，按[依赖启动01](./20261009-C139-dependent-readers-started-01.json)启动Ledger和GraphQL，Ledger真实health=OK。[真实查询独立04](./20261009-C139-actual-query-readers-independent-04.json)保存四个只读请求的完整原帧：Ledger GetServiceInfo完整H0/height308与checkpoint0摘要、consistent完整32字节H0/stride1/0–308范围，以及GraphQL H0/genesis和十个真实依赖范围均通过。

读取审计前几版的失败保持：SDK HTTP/1 fetch不适用于原生HTTP/2端口；审计误要求原生服务提供入口代理添加的链身份头；原生GetCheckpointRequest错误地使用SDK级字段而未构造生成oneof。最终使用标准HTTP/2原生gRPC与现有生成消息，仍要求真实成功状态/完整frame/H0/checkpoint0及全部范围。未改服务、伪造响应、降低固定目标或称原失败通过。

当前新增仅一个本任务必要HBase代理，复用C120六服务/六卷/CA/专用网络；SQL写入只发生在本任务C120目标的初始角色/数据库分配。原两组不同H0 RTD/indexer和工作publisher、29配置/原进程/八最新debug与其他容器保持，未发送原服务信号。C137三个不再使用的query已正常退出码0清理，七端口空闲；它们不因当前重建而重建。

完整709569回放/规范全数据比较、两个账户消费者、物理S3 publication/复制/fence、保留数据冷/WAL/另空重建和当前浏览器换代均尚未验收。普通Chrome仍待手动解锁Mac；正式发布仍709569、pending1006768，名称757805和新交易1034440不能称已归档。P139只收口完整准备/独立资格/实际启动的子任务，P139-4及P135完整合同继续开放。原89/98、细分剩余9.18%、trial_ready=false保持。
