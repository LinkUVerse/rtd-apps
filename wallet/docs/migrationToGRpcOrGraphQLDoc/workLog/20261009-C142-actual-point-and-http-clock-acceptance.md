# C142 真实有限读取与后续全量HTTP验收准备

[实际组件01](./20261009-C142-actual-point-component-01.json)与[独立01](./20261009-C142-actual-point-component-independent-01.json)通过。抽取已核验v2的真实point/latest/gate，使用原真实verify-full PostgreSQL、源与副本MinIO、既存guard mTLS，以及旧有限认证允许的205正文。三次正向均为3SQL/7HEAD，合计11SQL/25HEAD/3个真实204授权，三份3186字节正文完全相同。版本、COMPLETED/REPLICA、原授权前第二次SQL/额外源端HEAD，以及授权后SQL/双端HEAD/SHA/2秒时效成立。

私有错误CA客户端和无效凭据客户端对原同一205 HEAD实际分别报SSLError与InvalidAccessKeyId；未改原CA、凭据或对象。副本真实成功且两端均结算，不新增授权。恢复正确客户端后第三次读取正常且获得新授权。全部原始响应头/正文与各调用时序独立核对，36变异拒绝。只接受有限205组件；未监听新source，没有旁路完整709570认证门、原PG/S3写、原服务信号、容器、钱包签名/Execute或NFT业务动作。

完整source未来HTTP差分需要按请求ID/路径与真实授权原始头逐个核对，因此保留v2并准备v3日志增强，全部point/latest及预算不变，完整逆变换成立。又实际复现Python3.9/macOS的time.monotonic起点属于各进程，旧控制器的跨进程时间不能直接比较。v4增加真实共同CLOCK_MONOTONIC请求/授权边界，控制器v3使用同宿主共同域；原进程内Observation/2秒postcheck不变。完整源码逆变换和[双进程实际时钟观察](./20261009-C142-cross-process-clock-preparation-01.json)成立，原认证/回放保持。

未来全量HTTP独立审核器已编写，必须先通过完整C141及其指定独立审核，才读取实际完整source对照。原始响应完整性、membership、metadata窗口、全部客户端与source请求ID/正文、每组真正授权完整区间/人数与每成员2秒复查、同并发ABBA和正常自有清理均必需。第一轮[局部测试01](./20261009-C142-http-clock-and-binding-local-01.json)确切暴露组审核缺少成员clockDomain拒绝，失败和原源码保留；审核器v2只补一条成员域检查。复测[02](./20261009-C142-http-clock-and-binding-local-02.json)3测试/2真实隔离HTTP及11时序/范围反例通过，完整逆变换成立。此处SQL/S3/guard均为明确测试桩，未执行完整source实际对照，不冒充真实全source权限/故障或收益。

P142-2e只计真实205有限组件及独立核验；P142-2f只计原帧审核/实际时钟修正准备和局部测试。P141全部输入/quorum/独立前后复核、P142-2完整HTTP/权限/故障/收益和P142-3正常切换仍开放。完整41管线/两账户/物理版本保真归档/冷WAL、名称、普通Chrome及全部非NFT M5继续。原89/98、细分剩余9.18%、trial_ready=false保持；一期全部非NFT验收后再验证NFT。
