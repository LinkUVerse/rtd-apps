# ENV-05／06：查询传输实测子任务

当前Fullnode批准实测后继续协议验收。沿用最新RTD debug、原bridge和发布门禁，认证历史回放继续；不重启或改写已绑定运行配置。全部探针只读，不模拟、不签名、不执行。

| 子任务 | 证据与实施边界 | 状态 |
| --- | --- | --- |
| E1 | 当前renderer、原bridge manifest／固定Envoy来源及官方WEB帧／trailer合同核对；部署和合成fixture分别计数 | 已完成当前只读审核 |
| E2 | 指定合约仓库的隔离Envoy＋真实SDK／合成mTLS上游复测，补binary stream及text unary，使四组合有直接证据；错误／trailers／取消／deadline／头及4MiB原断言保留 | 已完成17项实测 |
| E3 | 实际原同链归档入口的binary／text unary及有限stream，身份、原生digest／checkpoint与末帧和status核验；不把合成prefix当链事实 | 已完成4组合／8请求有限页 |
| E4 | 实际CORS／预算／部署持久化和取消责任分层审核；不能只看单个请求或fixture勾完ENV父项 | 待推进 |
| E5 | 双方章节、Task、workLog、totalProgress按实际范围同步，保留失败日志 | 已完成本批范围，E4继续保持待验 |

官方gRPC-Web协议规定响应状态可在body的末尾trailer frame，text响应的base64 padding不一定与消息frame边界重合；必须完整读取status，不能把HTTP200或已读到的前缀当成功。依据[官方WEB协议](https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-WEB.md)及[Envoy官方桥接说明](https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/grpc_web_filter)。latest说明用于合同，实际测试仍固定原Envoy镜像，不把latest版本当已部署版本。
