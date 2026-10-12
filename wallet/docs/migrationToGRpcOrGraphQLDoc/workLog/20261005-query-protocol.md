# ENV-05／06：当前桥接与查询协议实测

日期：2026-10-05。按[E1–E5设计](./20261005-query-protocol-design.md)完成本批E1／E2／E3，完整预算及取消责任仍归E4，ENV-05／06保持开放。

## 当前部署审核

[只读部署审核](./20261005-query-bridge-current-audit-01.json)通过：现有bridge的manifest文件SHA、当前renderer SHA、ingress manifest、完整渲染配置与13个精确Ledger／Move方法一致；实际容器使用审核镜像、127.0.0.1:39603端口、unless-stopped、只读配置／双向TLS挂载。没有重新部署或重启。脚本仅获取所需Docker字段，不记录容器环境或私有配置；最新RTD源码、Display测试及8个已安装debug文件也由同一来源守卫再次核验。

E1证明当前实际绑定和持久化策略配置，未执行容器／主机重启试验，不扩张为所有持久化故障已验收。

## 固定Envoy与合成上游：17项

[实际协议fixture](./20261005-query-protocol-fixture-01.json)及[终态日志](./20261005-query-protocol-fixture-01.log)通过。指定合约仓库脚本启动临时TLS信任、固定Envoy和合成mTLS原生上游；没有连接RTD数据或修改系统CA，终态清理自己的容器及监听。

原14项包括binary unary、mTLS、可信头剥离、min checkpoint转发、CORS预检、执行路径拒绝、u64溢出前置拒绝、text双帧stream和末尾success trailer、unary Unavailable、部分流后Internal、AbortSignal、客户端deadline、Envoy duration截断及4MiB已解码请求拒绝。新增binary双帧stream／OK status、text unary／OK status，以及真实原生上游收到规范grpc-timeout且预算不超过调用者5秒。真实上游观察cancel／client-deadline／server-deadline三类非零reset。

该fixture证明实际固定Envoy＋当前SDK的四组合与协议控制，不证明真实发布门禁、Chrome CORS执行或真实业务服务的过载容量。[renderer 6项测试](./20261005-query-protocol-renderer-tests.log)同时通过。

## 原同链归档入口：四组合

[真实入口证据](./20261005-query-protocol-live-01.json)及[日志](./20261005-query-protocol-live-01.log)通过。Node子进程只明确信任原dev CA；请求精确https://127.0.0.1:39603/archive，禁止重定向／credentials及除4个只读Ledger方法外的路径。先要求近期部署审核，再进行binary／text各一组GetServiceInfo、checkpoint0、有限ListTransactions及首笔digest点查，合计8请求，0模拟／0签名／0广播。

两种格式均证明同一完整H0和原checkpoint0 digest；实际head分别253375及253391，两个时刻保留。固定0≤checkpoint<3、limit5的stream各5帧／5笔，原生proto帧SHA均为3c866c027b83cb268d368167a7b861cfeb400e1b3883332c159f406aa35b8d47，首笔digest／checkpoint与点查一致。每个流只有最后一帧含QueryEnd，reason=ItemLimit，完整status=OK及trailers均已消费。这证明当前有限页成功，不声称遍历了0–3全量交易；本批未复测多页游标恢复。

没有故障注入到真实原生Ledger或publisher，未验证该真实链路的RST传播／过载／断网／长期预算。正常Chrome CA、host permission、自定义网络设置、整体资产和完整钱包试用仍保持原未验状态。

## 权威合同与余项

[gRPC官方WEB协议](https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-WEB.md)规定body trailer帧及text base64 chunk规则；[Envoy官方gRPC-Web filter](https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/grpc_web_filter)提供符合该协议的桥接。合同要求完整解析末尾status；HTTP200、部分数据或已收到QueryEnd前的帧不能代替成功终态。官方latest说明不是本次部署版本证明，运行仍固定原审核镜像。binary／text四组合是本地SDK与固定Envoy的实际结果，不承诺所有第三方gRPC-Web实现具有同样能力。

E4继续推进实际CORS、请求／响应／流预算、过载、取消责任以及完整部署持久化证明。此前协议fixture与当前live成功均不用于勾完ENV-05／06。总体49/98，trial_ready=false；原认证历史回放supervisor保持。

最新只读观察（北京时间05:31:28）：历史连续0–41065／41066 markers，原22条watermark保持，原PID66145继续运行、无终态退出码。见[原supervisor观察](./20261005-query-protocol-history-observation.json)。没有恢复live或越过共同资产窗口门槛。
