# 开发链发布前缀专用覆盖索引（2026-10-04）

## 原因与实施

完整前缀count/min/max/sum查询原扫描10670数据块；通用覆盖索引每行重复完整chain_id和bucket字符串。新增link-u-smart-contract/all-in-one-deploy/localDeploy/tune_wallet_publication_prefix_index.py，在prepare校验指定源码运行环境与H0后，为当前开发链／发布bucket创建部分覆盖索引：键sequence_number、INCLUDE transactions，谓词固定该H0与bucket，名称由二者SHA256派生。使用CREATE INDEX CONCURRENTLY、独立autocommit连接、60秒statement／5秒lock超时；已有同名索引拒绝覆盖，输出预先独占创建并记录creating／complete／failed状态，失败须检查索引有效性后决定恢复。

实际创建wallet_prefix_e9b46fb21927ae43，valid=true、ready=true、8429568 bytes。未删除原索引，未改链／checkpoint表数据、guard SQL、校验逻辑或只读角色；无消费者或dev节点重启。

## 原始结果

20261004-prefix-index.json记录固定head266749，前后count/min/max/sum完全相同。各7轮实际查询：默认规划中位44.365→32.508ms；新计划自动Index Only Scan使用专用索引，heap fetches=0，shared hit blocks10670→1028。未设置enable_seqscan、成本参数或强制索引。诊断禁用客户端自动prepare，以对应当前guard每次请求新连接且相同aggregate未达自动prepare阈值的运行方式；未来连接池／通用预备计划必须重新验证适用性。

20261004-prefix-index-guard.json：实际checkpoint50000请求12/12成功，中位0.4715194375秒；独立准入验证pass，覆盖只读账本角色、可信mTLS、同一已提交边界、genesis/latest固定版本SHA、越界与任意路径拒绝、缺客户端证书拒绝。此前0.5147秒是另一个时段，不能当作严格同负载端到端A/B结论。

20261004-prefix-index-consumers.json：核对记录与当前OS完整进程身份一致，再由各活进程stdout文件读取水位。indexer22条pipeline最低143377、约5.03–5.87 cps；consistent4条最低91901、约2.44–2.50 cps；KV14条最低91889、约2.37–2.67 cps。不是仅凭文件或旧PID宣称运行，也未重启任何进程。索引仍落后且较慢消费者仍低于先前观测的链写入速度，不能声称追平或非空NFT／质押已可见。

## 依据与后续

[PostgreSQL部分索引文档](https://www.postgresql.org/docs/17/indexes-partial.html)要求规划器能证明查询谓词，通用参数化计划不能直接假定可用；本次以真实绑定参数执行计划确认当前路径实际采用索引。[CREATE INDEX](https://www.postgresql.org/docs/17/sql-createindex.html)规定CONCURRENTLY的写入并发与失败无效索引边界，脚本保留现场不自动删除重试。索引仅改变物理访问路径，不缓存认证结果、不省略前后完整前缀证明。

下一步仍需解决整体消费预算和吞吐，再完成落后夹具的真实资产与交易页面验收。所有原交易继续保留，不重发。41/98、trial_ready=false不变。
