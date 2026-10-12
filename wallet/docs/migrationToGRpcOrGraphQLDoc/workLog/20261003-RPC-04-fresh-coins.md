# RPC-04 · Fullnode 发送 coin 接入（实施中）

日期：2026-10-03。关联 RPC-04、NET-05／08／11／12、TX-05；本批不新增完整任务勾选。RPC-04 的最终 gas 构建、正式模拟和完整发送链路尚未迁完。

## 依据与合同

对照 Sui 官方 Core API（https://sdk.mystenlabs.com/sui/clients/core，当前查询成功）与本地已冻结的 rtd-typescript 2.31.3，读取 grpc/core.ts、grpc/client.ts、原生 protobuf state_service/object/owner、client/core-resolver.ts；读取当前 rtd 的 grpc/v2/state_service/list_owned_objects.rs。官方 grpc-api 网页请求不可用，未把该失败请求当作证据。SDK listCoins 对多个 proto optional 字段使用非空断言，钱包因此直接调用公开 StateService，显式 read mask 后验证所有必需字段；不修改 SDK 工作区。

双方 04／原 archive03 同步新增 6.2 小节，明确新鲜 Fullnode 选币与 GraphQL 固定资产快照的职责、分页／精度／owner／会话合同。这是局部实现细则，原目录、合并前原文和基准均保留。

## 编码与页面接入

- WalletFullnodeReader：私有 binary gRPC-Web client；MVR 禁用；凭据与重定向拒绝；完整 H0／checkpoint／保留下界前后检验。现代 Coin 的 objectId、version、digest、type、owner、balance 必需；共识 owner 保留 startVersion，不伪装普通持有对象。
- 发送 coin 完整扫描：空页有推进 token 时继续；重复 ID／token、空 token、256页／10000对象预算耗尽全批失败。整个扫描共用总 deadline 与 abort，会话关闭后拒绝忽略取消的响应；结果全部完成后才交付，不把 live scan 宣称为原子 checkpoint 快照。
- WalletRpcContext／Provider 注入 readFreshCoins。该读取不依赖 GraphQL 准入，不释放执行 client／不声称 ready；真实 Provider + StrictMode 的 Fullnode-only profile 受控测试通过。
- useGetAllCoins 及发送前 fetchAllCoins 均切到新领域接口；缓存键包含 binding、readSession、owner、type，不持久化、立即过期、无自动重试。钱包该 Hook 的旧 getCoins 请求已移除；其它产品 shared core 旧入口尚保留。
- SendTokenForm／转账参数改现代 Coin；排序使用 bigint，查询失败显示同步错误。金额不再调用会吞错／舍入的旧 parseAmount；精确解析正 u64 原子单位，拒绝超小数精度、非法及越界值。普通 token 使用完整新鲜引用，共识 token 保留 shared startVersion；共识对象不得作为 address-owned gas payment。
- 切换网络会话／账户／币类型清理旧预览；移除执行失败后重建、再次签名／发送的旧自动重试。TX journal 仍未实现，本批不证明未知结果可完整恢复，也不开放试用。

## 验证结果

实际命令均在 wallet 执行：

1. pnpm exec vitest run src/shared/rpc src/ui/app/hooks/useGetAllCoins.test.ts：203/203、17文件通过。包含新增26个实际SDK gRPC-Web帧测试、11个真实 Transaction 参数／精度测试、2个Provider／StrictMode集成测试和6个Hook委托／缓存测试。
2. pnpm exec tsc -p configs/ts/tsconfig.rpc.json --pretty false：exit0，wallet rpc／core rpc及直接依赖无诊断。
3. pnpm exec tsc --noEmit --pretty false：exit2，176条诊断（上批183、初始276）。SendTokenForm仍有旧Kit和blockData诊断；旧名称validation和其它未迁页面仍待处理。不能宣称完整钱包编译通过。
4. 本批11个源码／测试文件 prettier 检查通过；verify-migration-docs.py 通过13章／14原文／21RPC／22QA的完整性验证。
5. 只读AST重扫588文件：54 production候选（上批55），3条线协议literal；包含未使用／其它产品shared core，不是bundle闭包清零证明。wallet原getCoins调用已清除，core/useGetCoins仍在。

初次金额测试暴露 BigNumber.isPositive 对正号零为 true，已改为严格大于零；集成fixture初次误写gRPC服务路径断言，已按实际rtd.rpc.v2.StateService修正。修复后全部检查结果以上述最新日志为准；未运行真正Fullnode／归档HTTP服务、Chrome或链上发送。

详细输出：20261003-fresh-coins-tests.log、20261003-fresh-coins-typecheck.log、20261003-after-fresh-coins-typecheck.log、20261003-fresh-coins-format.log、20261003-fresh-coins-docs.log、20261003-fresh-coins-inventory.log；哈希／状态见 evidence/20261003-fresh-coins-verification.json。

## 当前限制与下一项

RPC-04保持未勾：旧gas构建、名称与签名发送器仍需迁移；RPC-09／14／15、全部TX恢复合同未完成。最新源码debug编译证据沿用上批；旧共享DB占用问题本批没有尝试杀进程／删数据，ENV-02／03未完成。继续接口和页面编码，同时筹备独立debug环境及link-u-smart-contract指定脚本部署；完整编译和核心Chrome／链上验证成立后才提供试用包。
