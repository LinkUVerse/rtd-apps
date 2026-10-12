# NET-10：Explorer消费Kit与明确查询所有权

共享core已移除旧Kit依赖，Explorer79条当前诊断阻断完整消费者构建。本批保护消费者接入，不把Explorer全面查询协议迁移混入钱包完成范围；Explorer既有JSON-RPC查询继续显式隔离于wallet领域Provider，钱包不增加旧协议fallback。

| 子任务 | 实施／验证要求 | 状态 |
| --- | --- | --- |
| M1 | 当前79诊断、Kit全部消费者、真实SDK API及本地RTD源核对；缺失analytics API不伪造 | 已核验基线与实际声明／实现边界 |
| M2 | 使用现代Kit提供钱包状态／连接；应用自有Provider和typed query hooks仅暴露SDK实际方法、网络／端点绑定明确 | 已实现并通过本批定向合同 |
| M3 | 原消费imports、stories、网络与ModuleFunction签名迁入明确入口；保持现代account／chain及同bytes合同，禁隐式自定义网络签名 | 已实现并通过本批定向合同 |
| M4 | 对剩余接口和React／结构化Display问题区分实际兼容缺陷与未提供服务；不以any／fake API静默通过 | 兼容问题已修复；analytics服务缺口待完成 |
| M5 | 消费者定向／core／wallet／Explorer检查；依赖lock变化后保留旧dist并重新核验稳定Local源码和产物；更新双方范围、Task与进度 | 定向／钱包联检通过；完整Explorer构建仍待 |

已有NET-10文档要求保护无关消费者；真实无法提供的历史analytics保持明确未完成，不修改RTD源码／运行配置，原历史回放继续。新依赖沿用已经评审和实际使用的现代Kit；只调整本应用声明，不替换SDK源码或增加真实链执行。
