# QA-A06 当前动态字段与 NFT 验收合同

以当前C25 production reader和同H0 GraphQL资产快照为准。新交易未入索引时保留旧快照事实，不从Fullnode拼接当前资产集合。原生定点只用于分别陈述fresh状态或历史BCS校验。

- [x] D1 保存同一当前可用snapshot，至少非空DynamicField与DynamicObject两种；生产完整列表与按nameBCS／kind点读逐一一致、确定fieldId／childId／类型和原BCS。
- [x] D2 在该固定S实际双向多页，验证cursor推进、正反全集相同、无重复或遗漏，生产全列表与实际分页逐项一致。页面大小只由审计直接查询改变，不改产品50默认或水位。
- [x] D3 非存在名称／对象明确缺失；child对象owner／BCS UID／类型与列表一致，历史version只使用服务实际覆盖的证据；负面owner／类型／BCS／分页／缺图／非视觉边界运行正式测试。
- [x] D4 对照父项完整合同审核历史证据、实际Chrome和当前来源；无法验证的子项明确开放，不能以reader脚本当成完整UI验收。

采用已授权回环HTTP开发入口，0模拟／签名／执行，不重启链或改认证前缀。
