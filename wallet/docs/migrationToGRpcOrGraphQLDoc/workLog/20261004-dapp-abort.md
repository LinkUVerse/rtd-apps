# dApp 交易 AbortSignal 后台取消通路

2026-10-04，TX-09／TX-10编码推进，未完成全部动态验收。

## 合同与实现

此前对照官方signTransaction 2.0源文件与本地SDK，输入含signal?: AbortSignal且execute继承相同输入。AbortSignal不能靠Chrome JSON消息变成后台有效信号；此前只签名将它混入消息、执行直接丢弃。

现在两个现代交易方法都使用cancellableRequest：页面监听取消，等待toJSON时可立即拒绝且不发送迟到交易；完成序列化后先订阅响应再发送，取消仅发送原始消息ID。signal不进入消息字段，已完成请求取消不再发消息，异常与迟到结果清理监听。调用方abort reason只保留本地，不传给后台。

ContentScriptConnection在首个权限查询前登记每个消息ID，取消只查当前port的注册表，不能由同源另一个tab取消；拒绝重复ID并限制64个活动交易。断开port也取消等待权限的请求。后台信号贯穿Transactions.requestApproval，关联既有getRequestSignal，取消清理待批准记录、撤销prepared批准并关闭窗口。此处不访问、不删除持久transaction journal，不赋予重发权限。dispatch后的状态仍应按原digest恢复，尚需主动AbortSignal专门联动测试证明。

## 已执行证据

- 首轮5文件41项：20261004-dapp-abort-tests.log。
- 新增连接集成测试后全量120文件1280项：20261004-dapp-abort-full-tests.log。
- 随后补充两个公开方法signal不跨消息边界及取消ID回归，接口8项通过：20261004-dapp-abort-interface-tests.log。未把这两个后加测试算入先前全量1280项。
- 钱包类型检查最终退出0：20261004-dapp-abort-typecheck-verified.log。前两次分别暴露遗漏PayloadType及测试使用非协议type，失败日志保留并已修正。
- 新增单元覆盖预先取消、未完成序列化期间取消、同步响应、消息发送失败、取消后迟到响应清理、取消订阅、重复ID／容量边界、跨连接同ID隔离、权限查询期间取消／断连、批准窗口关闭和失效signal。

## 待续

真实Chrome主动AbortSignal（批准前／批准中）、交易提交后取消与原摘要恢复、进一步modern合同审计仍待。不能将之前真实disconnect故障或正常四条链路直接算作本次主动取消验收。TX-09／TX-10不勾选，整体39/98，trial_ready=false。未重启dev链、部署合约、领币或发送实链交易，既有保留profile与pending记录未改动。

最终Webpack成功（20261004-dapp-abort-build-verified.log，33228ms），仍保留编译Local profile；首次构建读到修正前测试type而失败，日志保留。构建完成后重新运行四入口审计通过（20261004-dapp-abort-static-audit-final.json），此前并行审计不作最终产物证据。文档完整性与进度生成通过。本批构建尚未执行真实扩展主动取消。

后续六场景真实扩展主动取消已通过，详见[实测日志](./20261004-dapp-abort-live.md)。提交后恢复等剩余矩阵仍待，不将前述历史“全部主动取消未验”当作当前状态。
