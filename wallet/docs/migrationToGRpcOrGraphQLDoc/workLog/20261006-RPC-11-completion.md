# RPC-11 仓位组合与奖励精度完成

父合同为StakePosition组合、BCS、pool／inactive／activation、全部仓位及奖励精度。本次补齐原未验证的非空活跃仓位与钱包既定10000总汇率策略的有限规模读取；RPC-13真实Chrome质押／赎回及QA-A16完整业务验收保持开放。总体62/98（63.3%），trial_ready=false。生产链吞吐不在本次完成声明内，10000／20秒继续是明确钱包查询预算。

[实际公开读取](./20261006-RPC-11-current-public-01.json)：正式WalletStakingSnapshotReader通过39600 HTTPS、公开dev CA，在原H0、S586007／epoch3读取原owner0xa0ccc8…2233da，一仓位0x9df317…67290、version22、principal1000000000、activation3、pool active；完整真实汇率epoch0／1／2／3，13请求约5.35秒。同S全部依赖与最终revalidate通过，没有native旁路。原质押cp300333此前的空仓位历史不再冒充当前状态。

[独立审核02](./20261006-RPC-11-independent-audit-02.json)：再次固定同S／digest，按当前开发链明示单pool／单表限制，核对对象ID／version／digest、AddressOwner、原始StakedRtd BCS的principal／pool／activation。原归档的精确version22与GraphQL内容bytes及digest匹配。独立BigInt有理数半向上舍入得到估算奖励0，恰为激活epoch率等于最新率；不声称已兑付或正收益。8只读请求，零模拟／签名／Execute。

[10000规模夹具02](./20261006-RPC-11-scale-fixture-02.json)：生产static reader、真实Node读预算与原20秒deadline，active9998＋inactive2条，active200页，约1.19秒完整读取。三仓位active／inactive／pending保持，大整数本金9007199254740993的估算奖励900350633997570与独立整数计算一致。aggregate10001整批拒绝、末页重复拒绝、单表声明10001在率页前拒绝，分别200／200／0页，无部分交付。该fixture的BCS与SDL校验、源码／三份SDL输入哈希全部固定；零真实链请求，不把1.19秒当生产网络性能。

[85项当前定向](./20261006-RPC-11-current-targeted-01.log)覆盖V1／V2、全部pool、inactive／pending／unresolved、表size／name派生／损坏／空推进页、safe-mode补洞、缺率unknown、舍入／overflow／巨大epoch、domain覆盖及整体deadline；此前当前C19完整178文件2514与类型已经通过，源码本次未改、不重复声称重跑全量。C19dev／production／当前ChromeUI-worker与原七journal证明链接在[复合审计](./20261006-RPC-11-completion-audit-01.json)，源609dfb4e保持。

重新对标固定[Sui治理源码c8601468](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-json-rpc/src/governance_api.rs)，保存源码／SHA及当前RTD对应SHA。奖励含义沿既有公式，钱包BigInt有意修正旧f64损失；缺资料unknown不伪造零。两侧技术方案记录同一范围。普通ChromeHTTPS仍失败，未改信任／服务／链／水位／journal，不因本项通过放宽试用门槛。
