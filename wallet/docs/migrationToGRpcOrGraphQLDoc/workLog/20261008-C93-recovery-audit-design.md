# C93 原摘要恢复与完整审核适配

实施前增量，2026-10-08。原 C93 seed 的真实 Execute 回复 success=true、checkpoint=null，随后的 Ledger GetTransaction 暂未可读，旧 SDK 包装层抛出 not found。首轮失败、唯一 pending、原签名／unsigned／simulation／Execute 原帧全部保留；不能制造 seed/evidence 或声称首轮成功。

原 runner 的独立 recover 阶段已只读同一 digest，零 Faucet／模拟／签名／Execute，保存 recovered、全部新 ObjectWrite 对象及原十三对象／policy 后验。只适配审核器的证据位置：pending、unsigned、simulation、receipt 与路线仍取 seed 原文件；自然成功证据／恢复原始交易与对象取 recover。原 sealed runner、prepare／audit v1 与 native v1、nullable guard v2 不编辑。

P93-4 必须关联原一次 Execute、首轮失败与真实 recovery 成功，不能把 recovery 叫第二次执行。新 native v3 保留 v2 全八 NFT、五 cap、所有 Item／Listing／Lock、personal 内包 cap、OB token／table／registration／refs 及原十三对象／policy完整字节检查；只调整成功证据目录。独立 wire 审核逐解码 inspect／fund／seed-failed／recover 的每个原始 gRPC 请求、回复和 trailer，两个 Faucet 的原 JSON，验证最后 ENABLED 模拟与唯一 Execute 是同一 bytes／digest／signature。暂未可读的原 GetTransaction 是真实阶段，不以晚期成功覆盖原失败。

原 v1 复制的 effects.bcs nullable 类型未收窄，首轮类型检查两项失败完整保留；v2 增加真实 Uint8Array 存在断言已通过限定类型检查。v3 必须重新实际限定检查与全范围原生运行，不能从 v2 推断运行通过。

本审核零新模拟、签名、Execute、Docker或服务信号；仍不认证正式资产快照、Chrome、四路 live competition／durable pending 或任何父任务。
