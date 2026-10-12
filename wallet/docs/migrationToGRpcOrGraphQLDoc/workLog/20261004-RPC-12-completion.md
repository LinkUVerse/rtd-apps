# RPC-12 APY接口与消费端完成核验

日期：2026-10-04。该项完成范围是APY历史读取、算法语义、未知值与新领域模型消费端；不覆盖RPC-11全部仓位、RPC-13完整签名执行或QA／Chrome。

## 逐项证据

| 要求 | 当前实现与核验 |
| --- | --- |
| 历史与共同快照 | staking-reader从同S当前0x5系统BCS读取全部active/inactive pool及汇率表，核验声明size、类型、预算和最终快照；不以epoch-start systemState代替。reader测试覆盖V1/V2、错误表、部分结果拒绝。 |
| 汇率方向、年化、有效样本 | staking-rates使用pool tokens/RTD率、旧率/新率的365次幂减1，严格过滤0<APY<0.1后取最新30个有效样本。当前本地governance_api.rs及下述官方固定源码一致。 |
| safe mode补洞与补贴边界 | 定向用例覆盖六种subsidy cutoff并与显式补洞比较、u64跨度不分配逐epoch数组；safeMode在组合view与页面保留。真实链当前safeMode=false，未声称真实安全模式切换通过。 |
| 缺覆盖与非法值 | 一点／无历史为insufficient-history；平／负／异常收益过滤后为no-valid-samples；inactive明确unknown；未来／重复／非法u64／超预算拒绝，不显示NaN或伪造零。 |
| 模型与全部钱包APY消费端 | 列表、验证者表单、仓位详情、汇总、交易回执均消费WalletStakingView；统一展示规则，排序／统计不预先舍入，极小正值~0%，未知--，失败快照撤下估算。 |
| 实际多epoch历史 | 本轮真实认证GraphQL S41616／epoch2，读到同表epoch0、1、2，APY fraction=3.5770019835013045e-8，sampleCount=1；epoch1和2率相同，零样本被过滤。 |

官方核对来源：[Sui固定governance_api.rs](https://raw.githubusercontent.com/MystenLabs/sui/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-json-rpc/src/governance_api.rs)，本轮重新在线读取calculate_apys及calculate_apy，并读取本地对应源码。钱包按已批准主方案把旧空样本NaN／历史不足0改为显式unknown。旧Rust仅作算法依据，没有恢复JSON-RPC运行依赖。

新增scripts/probe-live-staking-apy.ts读取实际保存profile，截获真实reader已准入的动态字段以记录epoch与BCS汇率，实际调用只允许本机GraphQL和GetServiceInfo；输出不得覆盖，dispatches=0。证据20261004-live-apy-history.json／.log。没有读取私钥、构造或发送交易。脚本由tsx实际运行，不把钱包tsconfig检查当成该脚本的独立类型检查。

12文件95项当前测试通过，见20261004-staking-apy-audit-tests.log，覆盖算法、reader、hooks、view、质押页面和回执。测试使用既有debug Rust CSV向量，本轮没有重新执行Rust。最终生产代码与上一批相同，该批完整钱包tsc／dev构建／四入口审计已通过，证据20261004-apy-remaining-consumers-*；本轮仅新增只读验证脚本和文档。

RPC-12勾选完成。真实safe mode切换、更多验证者／30个真实有效样本、跨epoch活跃质押奖励、Chrome端到端继续由QA和RPC-11／13负责，当前不可试用。Mac本轮复查仍锁定，未绕过锁定操作。
