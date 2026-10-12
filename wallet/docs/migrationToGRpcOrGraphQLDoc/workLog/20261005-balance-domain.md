# RPC-05／06／04：独立完整余额与当前精确币预览

2026-10-05。按[Q1–Q5实施前设计](./20261005-balance-domain-design.md)推进，本批有限合同完成。原archive目录及14份保留原文不删除；父任务49/98、trial_ready=false。[汇总证据](./20261005-balance-domain-evidence.json)及[20文件来源清单](./20261005-balance-domain-source-inventory.json)限定本次范围。

## 领域合同与编码

[Sui官方映射](https://docs.sui.io/develop/accessing-data/json-rpc-migration)与[固定官方Balance源码](https://raw.githubusercontent.com/MystenLabs/sui/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-indexer-alt-graphql/src/api/types/balance.rs)支持总余额包含Coin与地址表示及Checkpoint.query固定S分页；当前RTD IAddressable.balances依赖consistent，不依赖hist_displays。原useGetAllBalances经过完整资产准入，Display未覆盖阻塞首页／ActiveCoinsCard；[实施前5项真实Provider测试](./20261005-balance-domain-before-01.log)复现4失败／1通过。设计与Task先存，然后编码。

新增WalletBalanceReader，仅Query.checkpoints＋Address.balances两依赖，20秒包括准入／所有页／末验，叶10秒与原生跨上下文预算保持。共同readSnapshotBalances抽取原严格解码／分页，被完整WalletAssetReader内部使用时仍保留同一原proof；moveType／unsignedAmount抽到asset-values并兼容原导出。每页first50、最多256页／10000项；owner匹配、唯一规范coinType、u128精确字符串及total=coin＋address。推进中的空页有效，明确完整空集合必须末验通过；超页长／预算、重复／停cursor、partial／缺字段／错链／摘要或coverage变化／取消全部失败，不能当零或保留部分成功。

Provider有效session独立注入readBalances，hook键wallet-balances／binding／readSession／规范owner，raw cache完整value＋proof，gc0不persist、idle20秒及idlefocus／reconnect；自己的失败撤下两者，切会话不复用旧值。NFT key或Display失败不撤下独立成功余额，各领域proof不能拼成完整资产原子S。币／NFT／质押确认增加余额域失效；不是TX-08目标checkpoint追平证明，receipt仍独立验覆盖。发送表单及准备器继续读Fullnode新鲜Coin／GetBalance，不按历史索引余额花费。

当前Chrome复核还发现币批准1.000000001显示成1 RTD、缺少最终摘要；[前置展示回归](./20261005-balance-preview-before-01.log)5失败／3通过。TxnAmount新增显式FULL选项，币批准显示完整小数并允许长数换行，原列表／收据默认舍入保持；批准显示固定prepared.digest，有效期及后台重验／授权合同保持。摘要只指当前预览，不是新回执。

## 库验证与稳定产物

[8文件96项定向](./20261005-balance-domain-targeted-03.log)通过。新增25项真实SDK／三份SDL reader用例，含三页／中间空页／精确大额、完整空集、13解码fault、6准入／末验fault、256页／10000项预算、无效owner／取消／关闭与整个20秒期限；新增5项实际StrictMode Provider／QueryClient，覆盖Display失败或pending独立成功／自身失败撤下raw proof／NFT轮换保持／完整空集／未配置零fetch。原7项full asset Provider慢读调度、12项实际余额hook会话切换及9项资产hooks保持领域隔离回归；新增3项可见金额用例包含超过safe integer的完整小数。

[钱包141文件1594项](./20261005-balance-domain-wallet-all-02.log)、[钱包完整tsc](./20261005-balance-domain-wallet-tsc-02.log)、[core4项](./20261005-balance-domain-core-all-01.log)及[core完整tsc](./20261005-balance-domain-core-tsc-01.log)通过。首批88定向／1591全量属于精确批准修复前状态，保留日志；首个定向失败是保留full asset测试消费键未规范owner，已修正为真实合同并重跑。

[当前第二次稳定Local构建](./20261005-balance-domain-local-build-02.json)1014份源码SHA 7a71e484e0b1eb60c959ebcd01aa8f1d9dd20a02878fb74d0d242cacd0b2fe26，构建前后及最终一致；UI189c8ca52eae5030cfdeb92cd32e45503a7fd985c2a5b5c315bdb7fdf8458cb5，backgroundd58de29527bf81e3cbda48cb4ac93b6e7ae59d37e1169e8faa0196d12852c641。显式profile03rev2／双入口AST及[四入口21已用／18未用方法闭包](./20261005-balance-domain-wire-audit-02.json)通过。当前源码与core／SDK全范围被纳入构建hash；原K／V构建、首批1013源码UI2e1023和两次dist备份完整保留，不能当当前UI证明。

## 实际公开TLS与当前Chrome

[实际公开TLS生产reader](./20261005-balance-domain-public-tls-01.json)使用审定server/ca.crt及原生锁，固定S288451／完整一页一币、4请求及末验，余额999998855320、coin同额、address0；额外完整资产准入仍partial拒绝，共5请求HTTP200、0模拟0Execute。仅该S的历史完整集合，不是当前Fullnode资金，也不证明实际多币／多页。

[当前Chrome第三次采集](./20261005-balance-domain-page-03.json)UI／worker逐字匹配当前dist，原账户首页999.99 RTD与ActiveCoinsCard在真实Display失败后仍可用。metadata精度9，发送准备实际用审定Fullnode GetBalance／ListOwnedObjects；1.000000001准确为1000000001原子单位。正式模拟BCS的sender／SplitCoins u64／TransferObjects自收款地址核对正确，SDK由该BCS算digest FALQL5x3EnPyyZ33TnsU2EtaCiyf11fSzdZntpJYt9FK与页面摘要一致，[批准页完整显示1.000000001](./20261005-balance-domain-page-03-preview.png)，最终发送可用但未点击。BCS SHA 720ce4f82352cd39bf0e906d9d59af9e56f51d009b4d2b84648187f5957c838d；这是未提交预览。

整个页面与返回流程共4次Simulate均checks启用、0Execute／0最终批准、返回后锁定、原两journal保持；返回表单后新准备的BCS不是替换已批准交易。[首页](./20261005-balance-domain-page-03-tokens.png)及[发送表单](./20261005-balance-domain-page-03-form.png)截图保留。精确本机SPKI例外不是正常CA或自定义host权限。

[原两个profile七条journal及原生effects只读复核](./20261005-balance-domain-original-journal-audit-01.json)通过，pending0、7次GetTransaction、0模拟0Execute，两profile当前worker匹配background；logical store SHA与上一metadata批完全一致。原成功和链失败记录不删除、不重发。

## 失败保留、环境与剩余范围

page-driver-01在正式预览中只记Error而未细化；page-02增加故障采集后证明模拟和最终按钮已成功、页面未显示摘要导致断言失败，旧[失败截图](./20261005-balance-domain-page-02-failure.png)同时证明数量舍入问题。原01日志不追补未知细节；02实际2模拟／0Execute保持。修改当前产品后新page-03完成全流程，不把旧失败或旧源构建冒充通过。

[本批原严格debug来源／回放只读审核](./20261005-balance-domain-history-01.json)于2026-10-04T23:29:22.140659+00:00取得连续0–89840／89841 markers，两次原validator均通过，原22水位不变、PID66145运行、boundedExitCode=null、目标386503尚未达到。诊断wrapper始终调用原严格validator，无绕过、重启或提前恢复；此前marker／watermark拒绝的D5调查仍开放。当前指定RTD最新debug／原genesis和合约仓库部署保持，没有改RTD、消费配置、数据库、种子或原交易。

Q1–Q5本批有限合同完成，双方SDK与执行新增节逐字对齐，并同时修正原“页面全余额共享完整asset proof”的表述；Task子任务不另计98父项。RPC-04非原生metadata／发送全部、实际多币多页／NFT隐藏与转出、非空Kiosk、活跃仓位／奖励／赎回、TX完整故障、正常CA与TRY／QA／REL仍待。49/98、trial_ready=false；下一继续剩余接口与同一认证回放，只有真实终态和目标覆盖成立才恢复索引与推进对应页面验收。

[文档／当前来源与产物完整性核验](./20261005-balance-domain-document-verification-01.json)通过：27份当前入口／方案文档、676条本地链接、五组paired合同逐字一致、20文件当前Q来源清单、1014份构建源码及UI／background摘要保持。13章／14原文／22QA／21接口来源覆盖由[主校验](./20261005-balance-domain-docs-primary-02.json)通过；rtd-apps、archive与合约仓库git diff --check均通过。这些检查范围与真实TLS／Chrome证据分开，不提升未验证父任务。
