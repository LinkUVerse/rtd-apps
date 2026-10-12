# 新 generation 查询后端保留数据重启 Q1–Q5

父范围 QA-A17／QA-A20；子项不增加98项。新 generation 为 dev-20261006-03，H0 BkuLHhdtnoK7yLxo2eQuvcjHtdyipE7MMyxgTJiyHGg4。当前源码及八 debug、原链全部消费者／publisher、两链 native、密钥／pending／声明／profile保持。只重启明确记录且身份精确匹配的新链五个查询后端及其独立 Docker mTLS proxy。

- [x] Q1：实际固定 S7483 的钱包资产与 Fullnode/归档对象身份、14 KV／4 consistent／Display durable 水位、账户四角色及保留文件hash，实施前全部成功。
- [x] Q2：确认新的 indexer Display binding／2+1+1预算、五个原 command 与launch-intent相同、current source/debug及运行身份。私有持久intent之后，锁定两个stack和五组件operation.lock，按现有SIGTERM/退出身份守卫停五后端，保留所有旧process/intent/log。未知退出或恢复结果不自动重复信号。
- [x] Q3：仅 Docker native-kv-stack 的 hbase-native proxy按已存在compose restart，不拉镜像；数据库/HBase数据/归档publisher/S3/PG均不删除或重置。按原精确command、正确41880私有mTLS环境恢复writer/indexer/consistent→ledger→GraphQL，保留最新Display override，不运行过期原launcher覆盖它。
- [x] Q4：恢复后实际重新读取固定S7483十对象比较、durable管道不回退、账户六旗标／创世交易与错链越界拒绝，并比较前后对象身份。成功才记录本批查询后端恢复；所有临时中断留证。
- [x] Q5：实际独立production Chrome重新读取四角色/资产/历史，所有请求范围与journal保持。用户原profile不打开，不导入OS/Chrome CA。

本批只覆盖五个查询后端和其mTLS proxy保留数据重启。全部foundation Docker冷启动、只归档重建、URL/registry变动及完整NFT/名称业务仍单列待验；不会据此勾选父QA-A17／QA-A20或global readiness。


实际结果由[独立完整审核01](./20261006-default-generation-query-cold-restart-audit-01.json)收口：唯一5个新查询SIGTERM＋唯一现有mTLS Docker proxy restart，全部原精确commands和Display/预算保持，新PID writer80816/indexer80920/consistent81053/ledger81166/GraphQL81258。实际HBase十四条水位均7483、SQL Display coverage及0–7483全部7484行仍在；[固定S7483前](./20261006-default-generation-cold-assets-before-01.json)／[后](./20261006-default-generation-cold-assets-after-01.json)两native角色十对象和余额／摘要完全相同。[四角色历史11](./20261006-default-generation-account-role-11.json)旧0–205账户页面与原交易完全一致，原native创世回执再次一致；当前建议覆盖窗口7483–7483单独真实读取，不误述为旧页面失效。[实际新Chrome03](./20261006-default-generation-C28-assets-chrome-03.json)重启后10检查/162真实请求、四服务资产历史/UI锁定及完整journal保持通过；0签名/派发/CA。

失败均保持：01准备期publisher记录路径错误/0信号；02准备期hash未排序Docker Mounts列表/0信号，独立十次[挂载顺序audit01](./20261006-default-generation-proxy-mount-order-audit-01.json)核验所有挂载字典canonical稳定/compose路径精确/readOnly。03实际只重启一次，等待旧runtime metrics数值超时；新committer在下一次提交前Gauge初始化0，不能把metrics名称中的in_db当作已读持久DB。改以独立实际HBase/SQL/真实查询验收，未再重启或改写03日志。原用户数据、所有失败、旧intent/process/log及两个operation目录保持。

consistent的RocksDB持久commit仍7483，但内存历史snapshot集合在冷启动后仅重建最新7483，原建议范围0–7483收缩为7483–7483；这不等于原checkpoint数据删除。account coverage使用六字段交集所以建议lower随其收缩；明确的indexed历史page只依其所需字段和认证索引复核，因此0–205实际仍成功。09误断言coverage lower必须0、10误断言旧page必失败，均为独立探针假设错误；11实际同时核验建议最新window和旧page成功，不把空latest页当非空语义。依据current history_coverage.py/configured_history.py/indexed_history.py及RTD synchronizer/committer源码，全部hash入独立审核。

Q1–Q5仅此明确范围完成。六foundation中间件全停全起、archive-only独立重建、完整generation/URL/registry矩阵以及父QA-A17/20继续开放；不会把本批计成额外父项。
