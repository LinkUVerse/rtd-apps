# C43 鉴权 TCP 计数隔离实验

本计划属于 QA-A20 诊断子合同，不是父项验收或正式安装。此前 C42 ABBA96 仅证明配置与点请求，未测量 TCP 复用。本次保持最新 debug、原两个链、25 查询进程、两个发布器、28 容器／14 健康以及所有原卷、镜像、启动身份；不重跑任何有限追赶、不接触原 pending profile。

- [x] T1：原 source／第三后继 holder、发布器、当前容器与配置完整绑定；两个独占监听器及一个 mTLS nginx，同原镜像与 CA。HTTP/1.0 与 HTTP/1.1 共用原 fresh guard 算法、8 checks／32 admitted／backlog32／5s admission／12s check／2s nginx connect，仅传输及对称观测计数不同。
- [x] T2：8／16／32 并发，每级 ABBA 四轮、每轮32个真实完整十依赖 GraphQL 请求，共384；另16个原41892 control请求。记录每个真实 TCP connection id、authorize start／finish、响应状态、真实 body／SHA／H0／十域窗口、计时与所有失败。所有鉴权每次仍执行原检查，禁止缓存及提高水位。
- [x] T3：只清理本次独占 container／两个精确 PID；持久保存配置、原始 trace、日志、所有 proof，原运行范围、卷／镜像及其他容器严格保持。失败也执行本步骤。
- [x] T4：独立审核原始400帧、TCP连接／请求计数对应、源码继承／计数包装、否定门槛及全部清理保持；记录观察局限，不据单次实验宣称根因已修复或持续可用。

计数包装只在 Handler.setup／do_GET／send_response／finish 调用原 super 前后记录无凭证元数据；不改 authorized、不改 semaphore、不返回自造窗口。两条测试 lane 都是隔离 listener；原41892用独立 control 验证，不把测试 baseline 冒称原入口。负例包括无客户端证书、公开 authorize 路由、错误 Origin。实验唯一部署位于 link-u-smart-contract/all-in-one-deploy/localDeploy，所有临时数据权限700／600。

实际完成：[400请求producer](./20261007-C43-admission-counted-transport-01.json)和[独立审核](./20261007-C43-admission-counted-transport-independent-01.json)通过诊断合同。baseline188×200／4×503，candidate192×200，原入口16×200；baseline188条授权TCP均一次，candidate72条TCP／192次fresh授权，120次复用、单连接最高13次。四份实际nginx鉴权connect timeout，零鉴权read timeout；未接受的四连接未进入guard，不能归因于其PG检查结果。所有成功帧都完整含十个域的实际同H0窗口。

唯一临时容器与两个精确监听PID已移除／结束，原全局109、29进程、28／14、所有卷镜像与配置身份严格保持；private trace／日志／配置保留，累计清理确认退役容器增至40。未安装／未认持续可用。协议和池同时改变，后继[单监听器池因素计划](./20261007-C43-admission-pool-isolation-design.md)进一步区分因素。
