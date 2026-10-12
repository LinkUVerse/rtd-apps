# ENV-05／NET-11：可选Display管线准入实施前设计

2026-10-05。上一轮质押领域迁移为实际进展；本轮session59830确认原有界回放仍运行。父任务49/98、trial_ready=false。

[实际诊断](./20261005-query-optional-pipeline-before-01.json)：fresh可复制发布前缀457546通过，原22管线链ID／hi／lo／pruner和288451端点全部有效，数据库23行且唯一新增hist_displays；当前window因精确22行要求返回null。当前主机graphql授权403，公开503；容器可连接监听器并收到403，历史TCP连接超时不能代替当前根因。

保留22必需管线每条严格校验和它们的共同窗口；仅允许当前RTD新增hist_displays作为可选字段依赖管线。显式允许名单，不接受未知／重复／缺必需／错链／越界／损坏行；可选行也校验chain、规范整数范围及初始化(-1,0,-1)状态。可选hist_displays不挤入不请求Display的基本入口窗口，也不授权Display读取。GraphQL当前SDL按字段availableRange和同S真实历史coverage／basis继续验收Display，完整钱包资产仍必须取得Display证明。没有以省略行来忽略损坏或改写水位。

| 子任务 | 合同 | 状态 |
| --- | --- | --- |
| H1 | 当前403原因和23行／22有效事实；保存私有配置、source、监听身份 | 已定位，待保存 |
| H2 | 显式可选管线覆盖合同，拒绝未知／重复／错链／越界与缺必需；真正RR/TLS SQL验证 | 待编码验证 |
| H3 | 指定合约仓库受控reload，仅重绑定index_coverage源码Hash并替换owned listener；保护原32 backlog、8检查／32请求预算 | 待编码／脚本验证 |
| H4 | 当前scope的发布前缀、公开TLS、领域读取与Display未覆盖拒绝；原回放／22水位不变 | 待实际验证 |
| H5 | 双方网络文档、Task／workLog／totalProgress和证据 | 待完成 |

操作仅在native-query-admission/listener/operation.lock下进行，先核验baseline及current owned identity，保存状态后停止该监听器，再原子保存config／manifest及新的binding，使用同一publisher解释器／launcher启动一次并再次核验。失败记录保留，不自动重试或重启其它服务；native query、KV、adapter、publisher及原回放不变。修复保持发布事实／fresh RR检查、trusted header与字段coverage，不改已固定消费脚本或原管线恢复门槛。

大规模汇率、cp300333原仓位、完整NFT／Chrome、正常CA和原回放终态仍独立pending；本批不提前勾选ENV-05／NET-11或试用。


## H4实施前补充：验证者选择的领域scope

公开入口修复后检查实际质押页面，发现SelectValidatorCard仍按assetSnapshotKey清空选择；无关NFT Display失败重查会取消已选验证者。先补回归证明此触发，再改为质押自身snapshotKey及readSessionKey；继承父view时同时传它的proof key，不增加第二次system读取。独立读取和继承view两种入口均须验证：NFT key变化保持选择、质押proof变化／会话变化清空选择。随后重跑钱包定向／全量／tsc、审核Local构建及原账户真实公开TLS验证者列表／选择／表单，只读、零批准零广播。原空仓位所在S晚于此前但仍早于cp300333，不把列表验收当活跃奖励／赎回。

旧queryGuard队列回归使用默认backlog5，16路合成请求出现ConnectionReset；该测试针对Handler的8／32预算，夹具应采用当前host入口的32 backlog。保留失败，按host政策修正夹具后再验证，不据此宣称Docker8100默认队列或完整过载故障通过。
