# ENV-05：归档传输头、最低水位、错误与取消收口

沿用[原E1–E5](./20261005-query-protocol-design.md)与[预算实施前计划](./20261005-bridge-budget-design.md)，本批完成ENV-05传输合同。ENV-06完整预算仍开放；没有把32个upstream请求限制当作所有downstream资源已有限。

## 当前真实部署与原同链读取

[当前审核](./20261006-bridge-budget-current-audit-01.json)实际通过，renderer字节、完整配置、13精确Ledger／Move路径、原manifest九文件、固定Envoy镜像、127.0.0.1:39603、read-only挂载与unless-stopped一致；当前八个已安装RTD debug与最新源码来源再次验证。原Docker冷恢复后已完成此审核及实际同链请求，不另重启主服务。

[原同链TLS20请求](./20261006-bridge-budget-live-02.json)／[终态日志](./20261006-bridge-budget-live-02.log)通过：binary／text各验证unary、五帧有限stream、首笔digest点查及完整末status；实际H0一致、两个head均586007，原生帧SHA3c866c027b83cb268d368167a7b861cfeb400e1b3883332c159f406aa35b8d47。

两格式各验证已观察min=586007时仍返回所选genesis0，不把最低水位当历史选择器；u64最大不可满足min返回Unavailable；负数、非规范前导零与溢出返回InvalidArgument。伪造可信上界／read-surface／forwarded头未成为返回上界。全程固定四只读方法／20请求、原CA仅Node子进程信任，0模拟／0签名／0广播。

[原20请求首次运行](./20261006-bridge-budget-live-01.json)在text摘要点查遇到实际Unavailable，14调用后失败；保留原失败，后一次为独立只读探针运行，不是SDK自动重试或Execute重发。

## 同renderer／固定Envoy、原生mTLS及实际Chrome

[30项实际协议检查](./20261006-bridge-budget-fixture-03.json)／[日志](./20261006-bridge-budget-fixture-03.log)通过。原17项保留：四组合、可信内部头剥离、min转发、合法grpc-timeout不延长调用者预算、mTLS、方法白名单、trailer成功／部分流失败、取消、两类deadline和4MiB请求拒绝。新增六非法min前置拒绝、0／u64最大转发、原历史selector不变、四非批准路径拒绝、CORS头与不带credentials、32准入／8明确503＋gRPC14、32取消原生reset及名额恢复。

Chrome153.0.8010.12从实际临时HTTPS loopback文档发起fetch：正确origin完成真实preflight＋unary＋末trailer；错误origin被浏览器CORS拒绝且未进入原生上游；AbortSignal和拥有未结束body的page关闭均触发原生非零RST。使用临时证书精确SPKI，未禁用CORS或web security。临时允许origin显式含测试端口，调用当前同一renderer；没有改实际生产／dev origin白名单。

这组取消证明固定Envoy到原生mTLS peer的真实传输控制；原同链测试证明现有认证链路的读取与最低水位。未故意挂起实际认证publisher／原生Ledger，不能称真实业务后端全部过载／故障或popup授权已验收；这些仍归ENV-06／QA-A03、A19、A20。正常Chrome CA与扩展UI／worker权限仍归ENV-07。

## 保留错误与权威说明

早期原始01因错误SDK根路径未启动；02／03错误假设本地拒绝都含body trailer，修正为同时接纳实际header状态与trailer帧；04为26项Node范围通过。05–08及20261006-01因Chrome公共地址空间文档访问loopback遭实际LNA拒绝，CDP覆盖后Permissions API仍prompt，未伪造授权成功。最终改为实际loopback HTTPS文档，仅验CORS并把公网到私网原生权限单列。20261006-02为29项通过，03新增实际page关闭后30项通过，所有JSON／日志保留。

依据[Chrome官方Local Network Access](https://developer.chrome.com/blog/local-network-access)、[官方Browser Permission API](https://chromedevtools.github.io/devtools-protocol/tot/Browser/)以及[官方WEB帧合同](https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-WEB.md)。允许CORS origin不会自动授予本地网络权限，SPKI例外不会证明正常CA。renderer[六项回归](./20261006-bridge-budget-renderer-01.log)通过。

**ENV-05完成；总体53/98、trial_ready=false。** ENV-06尚需downstream连接／HTTP2流及响应消息预算：当前Envoy实际启动日志提示未配置全局downstream连接限制，不能把upstream32限制／4MiB请求buffer冒称所有预算完整。下一步按[Envoy官方连接资源监控](https://www.envoyproxy.io/docs/envoy/latest/configuration/operations/overload_manager/overload_manager#limiting-active-connections)制定并验证受控升级；未更改运行renderer／manifest，不打断当前索引、publisher或journal。
