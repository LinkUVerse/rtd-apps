# C299 当前 G4 准入连接复用

C292/C296/C297 的真实浏览器记录保留偶发 GraphQL 503。当前 G4 内层 Nginx 错误日志明确出现连接 `host.docker.internal:43192/authorize` 超时；C297 另有四次 Fullnode GetServiceInfo 在浏览器连接阶段取消，尚不能认定与此同因。

当前 G4 准入监听使用 HTTP/1.0，内层每次准入重新建立 TCP 连接。复用已在 G3 使用并验证的 HTTP/1.1 Handler，只为当前 G4 加明确入口和空闲超时。生产 `guard.authorized`、每次 PG/源/副本可见性读取、索引覆盖校验及现有并发容量均保留。先在临时 loopback 43393 检查同连接通过/拒绝/再次通过，再将现有 43192 的精确自有进程替换；保留完整旧监听目录和恢复命令。内层 Nginx 仅增加八条空闲连接池、五秒空闲回收和 HTTP/1.1，不缓存准入或业务结果，不加查询总数上限。

变更后必须核验原容器身份、TLS/mTLS、三种实际读取和同 TCP 连接复用，再做普通 Chrome 刷新。失败即回滚监听与 Nginx；成功只证明本次实测，不宣称永久消除 503，也不关闭尚未完整验收的 QA-A17/REL-05。

配置依据：[Nginx upstream keepalive](https://nginx.org/en/docs/http/ngx_http_upstream_module.html#keepalive) 要求适当 HTTP 协议和 Connection 头配置；[Python HTTP handler](https://docs.python.org/3/library/http.server.html#http.server.BaseHTTPRequestHandler.protocol_version) 的 HTTP/1.1 响应需要准确 Content-Length，当前 Handler 已明确返回零长度响应。当前实际 Nginx 为 1.29.5，支持共享 upstream 的动态解析。

## 本次已完成结果

6项现有真实同连接测试通过。临时43393监听完成实际GraphQL/拒绝/ledger/consistent/GraphQL新鲜准入后已正常停止。生产43192旧监听PID99292按确切身份正常停止，原目录完整保留；当前监听PID16265。Nginx仅热重载，原CID/出生时间保持；三轮实际genesis读取使用同一上游TCP。原生Ledger与Consistent gRPC均grpc-status=0，缺少客户端证书仍400。

普通C51/C292重新独立抓取三轮首页刷新，余额100 RTD、发送/质押入口均可用。[抓包审核](./20261012-C299-home-har-audit-01.json)分别48/48/67个请求，合计163个HTTP200，无HTTP失败；每份包含40–54秒的自动轮询，不能称一次刷新必须发48/67次请求，也未据此限制查询上限。第三轮新鲜名称读取期间曾回退地址，之后重新观察到名称；不把HTTP200统计冒充每个正文的业务语义审核。最终关闭DevTools，保留正常首页。[联合证据](./20261012-C299-browser-transport-01.json)。

C297原503和取消均保留。当前证明准入连接复用已实际部署并通过三轮普通Chrome余额验收，未证明永久消除503。现有源/副本校验、数据库权限、超时及TLS策略保持。原进度仍96/98、37/45，剩余8个包。
