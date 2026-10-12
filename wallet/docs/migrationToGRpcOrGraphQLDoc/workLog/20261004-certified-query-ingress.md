# 2026-10-04 认证查询入口及真实 gRPC-Web

## 实施

部署脚本全部位于 link-u-smart-contract/all-in-one-deploy/localDeploy：

- start_wallet_query_ingress.py：固定 nginx 1.29.5-alpine digest，独立容器与既有 foundation 网络；GraphQL TLS39600、Ledger mTLS39601、内部 consistent39602。每请求走私有39592新鲜准入，发布上界和请求ID由代理覆盖。
- start_wallet_archive_bridge.py：复用 archive deploy/grpc-web/render.py，固定 Envoy digest，TLS39603/archive→native-query-ingress:8444，校验服务端SAN和客户端证书；固定方法白名单，剥离不可信 x-rtd（min-checkpoint除外）／x-envoy／forwarded 头。
- probe_wallet_certified_bridge.mjs：实际本地 SDK 请求真实独立链，无合成数据替代。

GraphQL关闭原请求头转发，仅带必要内容类型／Accept和重新生成的可信字段。Nginx gRPC无grpc_pass_request_headers指令；配置测试发现后保留失败配置并修正，未启动该错误版本。gRPC由明确覆盖可信字段、清除链身份与转发字段、桥接层按前缀剥离、Ledger mTLS共同约束。不能宣称Nginx自身已经通配删除所有未知头。

最初只读镜像检查误用了nginx:latest触发下载，且镜像无wget，探测失败；运行入口使用已固定的1.29.5-alpine digest，不使用下载的latest镜像。后续容器→host.docker.internal:39592/live实测204。

## 验证

- 两个代理配置验证和启动成功。
- GraphQL TLS请求携带伪造发布上界999999999，返回checkpoint100及正确digest，带生成的请求ID。
- 实际 Node SDK gRPC-Web GetServiceInfo与GetCheckpoint(0)通过，H0一致，height100。
- https://wallet.test预检200且明确Allow-Origin；未批准交易执行路由404；携带伪造上界的未来checkpoint读取被拒绝。
- 证据：[真实桥接结果](../evidence/20261004-certified-grpc-web.json)。该测试是Node SDK协议证据，不能替代浏览器CORS执行或钱包Chrome验收。

## 剩余

GraphQL当前仍直连原生consistent39541，须受控切到准入39602并重新验证共同快照。桥接当前Origin仅https://wallet.test，尚未配置实际扩展Origin。GraphQL浏览器CORS、Fullnode浏览器入口、账户接口与试用配置仍须接通。保持publicQueryReady=false、总体18/98。
