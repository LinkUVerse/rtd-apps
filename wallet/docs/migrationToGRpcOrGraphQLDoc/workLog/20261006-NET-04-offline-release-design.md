# NET-04 NC3C：独立认证发布来源实施前设计

当前父任务62/98，NET-04开放。C19产品源码、产物、原七条journal保持；本批先完成离线证据，不签名、模拟、Execute或重新发布。

1. 在link-u-smart-contract/all-in-one-deploy/localDeploy中新增只读导出工具，使用指定rtd当前源码的debug依赖编译；记录HEAD、diff、所有改动文件、模板、Cargo.lock、编译日志和二进制SHA，前后核验已部署debug二进制不被替换。
2. 信任起点是原部署受控genesis.blob与固定H0。复用归档认证前缀验证器，对离线缓存0..24450的所有检查点验证委员会签名、连续摘要、交易／effects／事件摘要及所有实物输出对象引用。不得使用HTTP响应或可任意输入的resume状态建立可信起点。
3. 只导出认证交易effects实际输出的base 0x1/0x2/0x3与原OriginByte包。固定OriginByte发布摘要Ed7UZxNEBcDNiZxb8giGHLo2AgD3w3myS2MrVqGHCnAq、检查点24450及原部署receipt。记录完整Object BCS SHA、storage/original/version、全模块bytes SHA。
4. 对OriginByte原受控编译三个模块，仅按Move发布规则还原self address为零，保持原字节码版本，逐字比较编译产物；若不一致保留失败，不能扩大归一化范围或自签接口返回值。原源码及转换记录另作可追溯性审计，provenance中的compiled=false不改写成编译通过。
5. 成功的离线认证结果与当前完整profile binding形成单独受控发布声明，严格canonical JSON与完整包覆盖；之后使用现有产品部署探测器进行新鲜只读比较。声明SHA从离线审计固定，不能从本次查询报告生成。

本批只证明受控dev链的Move发布绑定。服务软件部署签认、可选未配置名称／PK、当前Chrome HTTPS、完整ready及执行语义仍分别验收；不得因此勾NET-04父任务或trial_ready。
