# 可选 justSign 与真实 execute 绑定的原类型对齐

C167 第三轮 failed 保持。已实际观察单签赞助 policy、Gas estimation failed 稳定终态、具名 Approve disabled 及 prepared 为空；随后测试严格要求 tx.justSign=false 失败，原字段为 undefined。三个私有入口、批准和 Execute 均为 0，原正文与退出完整。

当前 ApprovalRequest.ts 的 TransactionDataType.justSign 为可选 boolean；dapp-request-binding.ts 先拒绝非 boolean 的已设置字段，再以 justSign 为真绑定 sign，否则绑定 execute。Wallet Standard 执行入口省略字段是正确原请求，不能给原 payload 补 false。

新 v6 测试与独立审核仅接受 undefined/false，且必须同时核对后台 binding.mode=execute、schema=1、唯一 requestId、原 origin/account/chain/network bindingKey、完整原 JSON 的 SHA256 及实际页面 execute=1。签名请求仍严格要求 justSign=true。四项拒绝必须同时具备 policy、费用失败、具名 Approve disabled、空 prepared、正常 Reject、空 transactions，以及零 Sim/Verify/Execute/新私有调用。

新预算 140000167 仍按四拒绝前置、全 16 双签、160 次旧签拒绝、40 模拟、16 原生 Verify 及全部原实体、实际终态、三 store、密文和退出标准执行。前两轮七个已批准摘要全部排除重批，第三轮没有批准。本次只修测试 schema 假设，不修改产品或响应、不补字段、不缩减合同。父项仍为 11/12。
