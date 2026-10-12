# C41 收件人风险实测：保留失败，完整合同未完成

按[R1–R4](./20261007-C41-recipient-risk-design.md)执行。[实际Chrome01](./20261007-C41-recipient-risk-chrome-01.json)整体失败，不勾父 RPC-23。全新受控收款人 profile 正常导入与保护、C41真实 UI／worker 和空三store基线通过，实际显示“该地址是一个对象”及“历史窗口内未见受支持的活动”；后者明确窗口0–244817，保留“有限覆盖不能证明从未交易或安全收款”。仅这两项真实提示成立。正面历史、无效格式、主动传输拒绝、正常重锁和独立完整原帧尚未完成，不能由5个已通过断言或48次采集替代。0模拟／签名／Execute、blocked空，原profile未打开；四个response.body采集取消也保留，不算成功帧。

已确认测试选址错误：第三个案例误用了发送人自身地址，与NFT表单`sender-address`校验冲突。[v2工具](../../scripts/test-current-C41-recipient-risk-v2.cjs)改用原Personal转移中已经核验的不同收款地址，只用于只读提示，不声称持有其私钥。实际只读诊断在4.78秒读到该地址的4条受支持活动、范围0–244817；allActivity／allTransfers仍false，此控制台诊断不冒充独立正式验收。

同时，[finite环境02](./20261007-C41-finite-live-independent-audit-02.json)实际共同窗口247964–244817为空，尽管14HBase／23SQL／4Rocks最低246293／252920／252927在推进。第一次等待最后看到的是空输入表单，不能将该行为仅归因于自地址校验、窗口变化或确认某个产品缺陷。v2增加新鲜独立环境窗口与实际生产WalletAssetReader完整读取／Fullnode NFT匹配前置，窗口不足时在启动Chrome之前拒绝；不修改产品、超时、cache、journal或admission，不在此环境下重复完整UI测试。v2仅已编写并通过语法检查，未执行。

G4仍在执行，[三API／六loop自然进度审核](./20261007-C41-finite-all-account-audit-01.json)通过，positive token／cap各7021／7110次自然提交及原sealed payload／公共checkpoint匹配。该证据只接受实际账户服务和受保护进程，不授予finite目标、恢复authority、当前framework或完整Chrome验收。总计84/98、14开放，trial_ready=false。


后续实际02／03均整体失败并保留：[02](./20261007-C41-recipient-risk-chrome-02.json)前置真实WalletAssetReader六对象与Fullnode直接NFT匹配、窗口有效；[03](./20261007-C41-recipient-risk-chrome-03.json)采集13个变化样本，相同form key／binding／readSession下输入消失再返回为空，资产snapshot key变化。已确认该问题是同authority资产刷新导致表单卸载；不是本轮使用自地址。[独立诊断](./20261007-C41-nft-draft-reset-independent-01.json)保留旧C41源与prod字节，实际回归8项中的3项失败／5项撤销通过。[修复设计](./20261007-NFT-draft-retention-design.md)记录新修复和独立新构建，不覆盖原C41证明。原frames取消／R2正面历史、R3传输拒绝、R4重锁与独立完整合同仍未完成。

[读取窗口转变审核](./20261007-C41-range-transition-audit-01.json)从实际02空窗口至03非空窗口证明：native watermark更新因请求checkpoint低于consistent reader_lo跳过，1673条同下界原日志，随后同GraphQL／finite PID自行恢复。只是该有限追赶阶段的瞬态解释，不概括全部空UI／传输失败，也不宣告G4完成。
