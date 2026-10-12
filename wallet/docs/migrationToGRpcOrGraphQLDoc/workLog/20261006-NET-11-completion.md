# NET-11：完整读取政策与当前错误分类收口

按[实施前设计](./20261006-NET-11-error-completion-design.md)完成编码、直接故障矩阵与当前产物核验。本项证明NET-11读取错误／重试／预算／取消及执行不重试合同；各真实页面与服务宕机的Chrome矩阵仍由QA逐项验收。

## 当前修复与直接证据

旧分类对16种实际生产类型一律显示未知：准入reviewing／quarantined，准入状态corrupt／budget／stale／unavailable，schema四原因及账户历史六原因。[原复现](./20261006-NET-11-errors-reproduction-01.log)16失败／32通过保持。公开分类现在区分观察未完成、负面隔离、存储不可用、未配置、数据预算、覆盖不足和快照变化。错误对象与原message保持；不写数据库，不撤销Fault／pending，不改变查询或执行重试。

[11文件312定向](./20261006-NET-11-targeted-01.log)通过，包含16新类型以及原错误、队列、重试、身份期限、能力传输、账户服务、执行／模拟、Provider和NFT错误展示矩阵。[170文件2398完整回归](./20261006-NET-11-full-01.log)、[完整tsc](./20261006-NET-11-types-01.log)、[格式](./20261006-NET-11-prettier-01.log)实际退出0。

## 逐项政策核对

- 分类：原生gRPC code、DOM取消／超时、同链身份、height reset、快照、持久观察、准入、schema及账户历史类型有固定公开提示。未知／服务自定义对象不猜测，不透出服务原文。reviewing／quarantined、损坏、未配置和总数据预算均非自动重试状态；展示上的retryableRead不能作为执行重试授权。
- 只读重试：fetchSnapshotRead仅由GraphQL快照调用。408／429／502／503／504最多原请求3次，原signal及请求不变；固定指数退避＋抖动，释放丢弃响应流，取消中止后续请求；Retry-After超过60秒或溢出不提前重试。400／401／403／404／500、浏览器无法区分CORS／TLS的TypeError和业务partial不自动重试。
- 并发：WalletReadConcurrency所有context共享4个原生Web Locks物理permit；每context最多64个等待项，等待可取消。Promise实际结束后才归还permit；忽略取消的物理任务继续占位，不靠逻辑超时制造额外名额。session／binding变化拒绝迟到结果。
- 期限：九个领域读取使用owned deadline，整体预算不因重试或翻页刷新，完成释放timer；真正取消和未终结物理工作保持负面／pending。准备、simulate和执行辅助查询经过leaf permit；Execute不经过只读wrapper。
- UI：全部共享core领域hooks显式retry:false；钱包余额／元数据、历史、资产、名称、质押、接收方、预览、恢复和faucet均有显式读取／执行规则。QueryClient保留的默认1次是非领域查询的默认值，不对上述合同额外叠加。此前九类公开错误展示与实际NFT受控失败／恢复证据保留，不提升成其它八页已实测。
- 执行：reader.dispatch只有一次ExecuteTransaction，没有loop／retry；coordinator提交屏障之后失败只返回未知并恢复原digest。Fullnode／archive的只读回执查找是原摘要查询，不是重发。[当前21已用／18未用四入口闭包](./20261006-NET-11-wire-01.json)及[Provider审计](./20261006-NET-11-provider-01.json)通过。

## 当前C14构建及浏览器边界

[稳定Local构建](./20261006-NET-11-build-01.json)1082源码SHA8e397412bcfdfbc52c4a3529b168d31ef8502a5b56194746b1c0429fbec6ea1a；UI35ee0635b956a47e462ac25bb17b9792eabec33350b601000b1d4493dc01c844，后台58709978eb340fa38d383caa41de003cc3e11bbc3639a007568f4ce9eba0a8c1（后台字节与C13相同）。[155来源](./20261006-NET-11-source-inventory-01.json)及[32个C13旧产物](./20261006-NET-11-c13-backup-manifest-01.json)保留；旧两源替换回去可重建C13产品SHA39a3a5e，未改SDK／RTD源码。

[实际fresh当前Chrome](./20261006-NET-11-browser-01.json)加载UI及worker逐字与当前dist相同，native pending0／fault0、外部请求0、模拟／Execute0。Fullnode、归档、GraphQL三角色H0读取200且一致；账户接口HTTP200未建立完整身份／覆盖，networkIdentityAccepted=false保留，不能称四入口准备好。精确dev SPKI，不是正常CA。

[原七journal惰性核验](./20261006-NET-11-original-journals-01.json)与原逻辑SHA／实链effects一致，旧native状态前后保持；0模拟／0广播。未删除旧pending，未放宽存储守卫，未更改发布／索引watermark。原有真实NFT失败展示仅为此前有限Chrome证据。

父NET-11按完整编码及规定定向故障矩阵勾选；总体52/98，trial_ready=false。NET-04、ENV完整预算／正常CA、所有真实Chrome QA和REL仍独立保持开放。
