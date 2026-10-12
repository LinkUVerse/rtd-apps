# RPC-11／12：质押奖励与 APY 算法基础（部分）

日期：2026-10-03。上一轮 NFT 执行迁移属于实质进展；本轮继续质押链路，未勾选任何完整任务。

新 staking-rates 模块接收完整已准入的 epoch／rate 表：规范u64、拒绝未来／重复epoch和超过10000行；金额与奖励有理数使用bigint，非负半向上舍入。缺当前率、当前零率、超u64结果明确 unknown，真实非正收益才为0。激活率在表范围内按更早rate补洞，范围外沿用源码默认rate1；rtd_amount=0也对应rate1。pending不估算已得奖励。

APY遵循pool-token／RTD方向、365年化、严格0<apy<0.1、最新最多30个有效样本。safe mode填入相同rate的零收益必被过滤，故不需要逐epoch分配数组，u64级跨度也可处理；补贴边界按补洞后的相邻epoch检查。缺两点历史和无有效样本分开返回未知，不传播NaN。该模块尚未接入系统／validator／pool组合reader或钱包页面，不声称RPC-11／12已迁移完成。

权威依据：本地 rtd-json-rpc/governance_api.rs、rtd-types/rtd_system_state/mod.rs，固定官方Sui c860146823abcedef45a1b5a9c766920be98a29c对应源码（见 evidence/official/sui-staking-rates-manifest.json）。两套SDK合同同步新增4.3。通过当前debug rtd_types库实际运行rate()和旧governance算式：principal=9007199254740993、激活率1、当前率2/3，旧f64结果4503599627370496，精确值4503599627370497。该差异被明确记录并测试，不能声称大额金额与旧f64逐位相等；金额超u64不复用旧饱和最大值作为有效估计。

32项新测试覆盖整数精度／默认rate／half rounding／safe mode补洞／补贴边界／有效样本上限／巨大跨度与原生Rust向量。最终43文件594/594定向测试通过，rpc专用类型检查通过。原生Rust编译和运行exit0，输出5组奖励、3组APY、1组零RTD率，源文件／库SHA／CSV均保留。初次全套测试因happy-dom下import.meta.url不是file scheme加载证据失败，已使用与现有Rust向量测试一致的工作区路径；初始失败日志保留，最终全套重跑通过。

输出：20261003-staking-rates-suite-final.log、20261003-staking-rates-typecheck.log、20261003-staking-rates-rust-build.log；证据：evidence/20261003-staking-rates-rust-proof.json、rust.csv、rust.rs.txt。原生计算测试没有启动节点或部署合约，不是debug链多epoch验收。最近一次完整wallet检查仍146条诊断，本轮不声称完整构建成功。总体仍13/98；后续必须完成同S系统／池／汇率组合、仓位及页面、质押赎回统一批准执行，随后用指定debug环境进行真实核心验收。
