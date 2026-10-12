# QA-A03：Ledger/Move、白名单及线协议回归完成

[固定33协议](./20261006-ENV-06-candidate-pinned-01.json)同当前部署renderer/base renderer/SDK/Envoy固定镜像输入，实际原生mTLS fixture验证binary/text unary及两帧stream、末OK；Unavailable与部分流后Internal末trailers、AbortSignal及调用deadline释放native upstream、Envoy时长上限的真实Internal transport error、32并发/8超额失败、取消后恢复容量、允许/拒绝CORS及实际Chrome关闭拥有page的原生RST。64合法H2流和第65条关闭、128全局连接另有实测。不能把fixture当真实链上故障或普通Chrome CA通过。

[原链20读取](./20261006-ENV-06-bridge-live-01.json)Ledger两格式unary/五帧有限transaction stream、末status/trailers、相同原生帧摘要、digest点查、历史genesis选择器与H0通过。[本次Move与拒绝](./20261006-QA-A03-move-denials-01.json)actual exit0，8请求：两格式Ledger身份与同链系统0x2包成功、非空modules、完整GetPackageResponse protobuf SHA一致，末OK/trailers完成；State GetObject、TransactionExecution ExecuteTransaction、Admin GetServiceInfo及未知Ledger方法均空5字节请求HTTP404。

明确记录deniedExecutionPathProbes=1：该URL只带空gRPC帧，不含交易或签名，入口404，没有链上Execute（admittedExecutions=0）；不假称抓包里没有执行URL探测。此前执行白名单拒绝和本次原链拒绝分层。其他管理方法由精确13条白名单之外均不匹配的当前renderer配置承担；没有尝试危险管理操作。

[新鲜运行审核](./20261006-QA-A03-bridge-audit-01.json)actual exit0确认最新8 debug/source、原H0/generation、bounded renderer/13精确方法、固定镜像、只读挂载及持久manifest。新增脚本和audit摘要执行前后固定。所有读取仅Node子进程公开CA信任；CORS/取消的Chrome fixture使用精确开发叶SPKI边界，普通TLS仍由ENV-07/QA-A19完成。

本次在4/1/1再分配后实际查询成功，说明数据面恢复；SQL与业务共同S尚未追平，不能由传输回归代替。真实业务后端分别不可用与恢复、Docker故障冷启动仍由QA-A20验收。按[实施前范围](./20261006-QA-A03-archive-design.md)完成本项，总体57/98（58.2%），trial_ready=false。
