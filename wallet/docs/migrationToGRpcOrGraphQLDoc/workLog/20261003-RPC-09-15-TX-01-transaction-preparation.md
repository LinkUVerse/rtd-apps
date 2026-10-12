# RPC-09／15、TX-01 · Fullnode构建与批准bytes（实施中）

日期：2026-10-03。关联NET-03／08／11／12、RPC-04／09／15、TX-01／05；本批不新增完整任务勾选。上一批发生实质代码／验证进展；本批继续实现完整目标，不缩小范围。

## 权威依据与双方对齐

查询成功的Sui官方来源为 https://sdk.mystenlabs.com/sui/clients/grpc（原生服务、Fetch transport、read mask与response helpers）。https://sdk.mystenlabs.com/sui/clients/transactions 请求失败，未用该结果支持任何结论。实际ABI依据已冻结的rtd-typescript2.31.3源码：grpc/client.ts、grpc/core.ts的resolveTransactionPlugin／simulateTransaction／response parser、client/transaction-resolver.ts、address-balance-transaction-expiration.ts、Transaction／BCS effects；同时读取当前rtd的transaction_execution_service/simulate/mod.rs及balance_change.rs（amount为i128，不能放宽为u128正负范围）。SDK与rtd源码均未修改。

钱包05章与archive原04章同步新增第7节；原目录、原文、编号和基准保留。明确解析模拟≠最终bytes正式模拟、不可静默覆盖显式gas／赞助／expiration约束、只重验批准bytes，以及未完成journal／其它消费者不能当可试用。

## 编码与业务接入

- WalletTransactionReader使用每次操作独立的私有Fullnode binary gRPC-Web client。总deadline默认20秒／最大60秒，最多64次内部unary；SDK漏传signal的调用仍由transport／Fetch绑定会话及取消，保留status／trailers；不开放执行接口。复制Transaction数据和内置intent，不继承调用方可执行build插件。
- 用当前SDK原生resolveTransactionPlugin进行Move参数／引用／gas解析；响应必需status、epoch、sender、kind和gas关键字段，不让optional字段的默认值冒充成功。构建前及完成后核验完整H0、checkpoint与保留区间，退高／换链／取消／关闭会话均拒绝。
- 固定BCS后对同bytes再正式SimulateTransaction，checks=ENABLED、doGasSelection=false、read mask为transaction／command_outputs。对照本地digest、回传BCS、effects BCS可重编码与status／epoch／gasUsed／digest／V2 lamport和对象集合；现代transaction字段重新编码也须等于最终bytes。balanceChanges按规范i128保留精度。失败不生成可批准预览；独立simulate保留FailedTransaction联合类型，仅表示模拟失败。
- WalletRpcContext／Provider注入prepareTransaction／simulateTransaction，返回bytesBase64／digest／会话与gas原子单位及现代模拟结果；不用旧RPC DTO。gasPaymentKind区分coin、addressBalance和gasless；priced空payment必须有ValidDuring／Validity，不能用coin数误判addressBalance不可支付。
- 发送页gas估算已切到新鲜Fullnode coin＋原生构建／正式模拟，使用实际coinType，修复原先一直按RTD构建和按token decimals二次解析gas的错误。未取得有效估算／发生错误时禁止继续，比较gas金额直接使用bigint原子单位。
- PreparedCoinTransfer冻结原输入与批准bytes；表单任何内容／账户／绑定／读会话变动均拒绝旧批准。预览后的发送入口不再重新选币构建；签名前只对批准bytes重验，失败要求新预览／新授权。

## 验证结果与修复

1. pnpm exec vitest run src/shared/rpc src/ui/app/hooks/useGetAllCoins.test.ts：250/250、19文件通过。其中transaction reader35项，coin transfer批准边界12项；含真实SDKgRPC-Web帧、真实Transaction／BCS、Provider／StrictMode及取消测试。
2. pnpm exec tsc -p configs/ts/tsconfig.rpc.json --pretty false：exit0，新rpc／core领域及直接依赖通过。
3. pnpm exec tsc --noEmit --pretty false：exit2，175条诊断（上批176、初始276）；没有新的rpc／core领域诊断。发送表单旧Kit及名称validation旧client类型仍未迁；不能称完整钱包编译通过。
4. 本批9个源码／测试文件prettier检查最终exit0；一个测试文件初次格式检查失败，重排后通过。
5. verify-migration-docs.py：13章／14原文／21RPC／22QA完整性通过。双方新增第7节完全相同。
6. AST扫描592文件、54 production候选、3 wire literals；统计仍包含其它产品或未使用shared core，不能作为最终bundle清零证明。

初次测试发现SDK会把领域校验错误包装为SimulationError，已保留其cause中的钱包错误分类；测试fixture的递归返回类型已显式标注。Rust源码核验纠正balanceChanges到i128边界，增加边界测试。日志及源码SHA见evidence/20261003-transaction-preparation-verification.json；详细输出均在本workLog目录的transaction-preparation日志文件。

## 未完成项与下一步

名称解析仍使用旧接口，PreviewTransfer／其它NFT、dApp、质押消费者与底层signer／execute尚未全迁。发送页现在保留批准bytes，但尚无durable journal／跨窗口执行锁，不能宣称TX-01／05完整或开放试用。模型支持的addressBalance／gasless模式还需同链能力及真实fixture验证；本批模拟只是受控Fetch证据，没有实际签名或广播。

当前完整任务仍11/98。继续按清单迁移各页面及全部领域，优先完成代码＋核心测试；同时用已编译的当前源码debug产物及link-u-smart-contract指定脚本筹备独立dev环境。既有DB占用状态本批没有重新启动、杀进程、删除数据或部署合约。真正dev链／Chrome、可安装试用包与QA全矩阵均待完成。
