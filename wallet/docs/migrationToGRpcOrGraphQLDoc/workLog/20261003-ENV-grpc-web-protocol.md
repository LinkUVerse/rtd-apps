# ENV-04–06：归档gRPC-Web配置与真实协议探测

2026-10-03。本轮新增归档仓库deploy/grpc-web/render.py、test_render.py及README。协议转换采用Envoy官方grpc_web filter，不写业务JSON代理。官方依据及详细合同见对应README链接。镜像v1.39.1固定digest sha256:57e14a549d7bd43c8d3f6d03e8cfa653e037d4b38e133acd9b54f38c524401b4，实际pull及配置校验日志保留。

配置仅从显式binding渲染，要求标注已批准发布入口、完整H0、TLS文件、host/port、origin及逐方法列表；拒绝raw-ledger role、短ID、通配方法、Execution/State等非允许服务。渲染本身不证明上游真实身份或门禁，部署时仍需独立当前证据。仅/archive前缀的exact path与POST/OPTIONS可转发，默认404，原生后端为mTLS HTTP/2。Lua清理外部可信上界／内部身份头，保留合法最低checkpoint及deadline，拒绝非规范u64／溢出。不由桥接自行制造发布上界。

真实Envoy --mode validate初次通过，但最初协议探测SDK返回404。定位到Lua清理头后默认清路由缓存与prefix rewrite交互；对照禁用Lua诊断可到达上游但泄漏spoof头，诊断未当通过。正式修复clear_route_cache=false，路由只依赖Lua不修改的path/method，恢复转发且仍剥离可信头。曾有Node assert.rejects错误使用UnaryCall thenable，改async await后继续；所有失败证据保留，未改弱断言。

验证结果：
- 6项渲染守卫通过，新增路由缓存配置断言。
- 最终真实Envoy TLS加载／配置验证通过，evidence/20261003-envoy-config-final-validation.json。
- 指定合约仓库run_wallet_grpc_web_probe.py及probe_wallet_grpc_web.mjs启动临时合成mTLS原生上游、Envoy和实际RTD SDK；8项通过：binary unary、mTLS、可信头剥离、最低checkpoint透传、CORS预检、执行方法拒绝、u64溢出InvalidArgument且未到上游、text双消息帧及成功trailers。evidence/20261003-grpc-web-protocol-final.json。测试临时CA仅传给Node子进程，没有忽略证书错误或修改系统信任。结束后临时服务／容器／证书移除。

尚未：真实认证发布门禁绑定与同链能力验证、Compose持久服务、Chrome、取消/超时/流中错误/过载与全部消息预算。未把桥接直接接39485裸Ledger或宣称入口已上线。ENV-04–07及TRY不勾，当前16/98不可试用。钱包业务源码未修改，不重复全量测试结论。
