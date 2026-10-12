# C36 冷恢复后的认证账户历史保留

实际诊断`20261006-postboot-account-private-diagnostic-01.json`证明67518–75097失败于`addressObjects does not cover requested checkpoints`；同次0–205实际仍成功。新native/index/sealed根和中间件已恢复，不能把业务失败解释成Docker未启动，也不能清库或改水位。

Sui [官方available_range源码](https://raw.githubusercontent.com/MystenLabs/sui/main/crates/sui-indexer-alt-graphql/src/api/types/available_range.rs)将IAddressable.objects映射到consistent，而Query.object（非version点查）映射obj_versions；[官方Address源码](https://raw.githubusercontent.com/MystenLabs/sui/main/crates/sui-indexer-alt-graphql/src/api/types/address.rs)明确checkpoint bound由scope承载。RTD当前源码`rtd/crates/rtd-indexer-alt-graphql/src/api/types/available_range.rs`312–313及历史对象映射一致。推论：历史address枚举须服从其实际保留窗口，不能用Sui概念性历史支持覆盖当前RTD冷快照下界。

- [x] H1：保留原62个Python文件和6个worker的原配置/来源pin，在独立候选目录实现并验证；原三API/六worker保持运行，候选只读真实SQL/GraphQL，不改publication或业务数据。
- [x] H2：只有deployment-pinned、完整quorum、相同sealed head/root/type的认证Token发现路径，才使用transaction-relative SQL状态及真实公开checkpoint顺序/digest见证，逐原OwnerToken核验input/output边界；普通未认证registered/discovered路径继续原address历史枚举与严格保留合同。缺失/错root/错point/重复/未覆盖/间接未知归属仍拒绝，不能以其他Kiosk cap替代指定OwnerToken。
- [x] H3：Personal/standard cap路径实际不读取Address.objects，应仅要求真正使用的历史字段覆盖；保留完整object-owner/transaction timeline、前后coverage验证和全账户/转移未认证旗标。原生transaction-relative权属与完整固定窗口分页/公开门禁/实际native回执独立比对，当前合成反例和全后端测试通过。
- [x] H4：候选全部核验后受控切换。6个worker的nativeSources当前含整个62-file Python模块；须保留原字节/配置/进程记录，按真实归属停止并在原同H0/root/db基础上重新绑定新源码pin，三个API同时明确加载新版本，验证实际续写/所有入口/拒绝门禁。不得让运行器因偷偷改源码进入来源失败。
- [ ] H5：原账户语义/Chrome活动页、Personal/OriginByte非空历史、所有转移与父QA-A13/17/20最终矩阵分别验收。

候选检查通过之前不替换canonical源码或生产服务。以上仍为技术决策与子任务，没有把等待、候选文件或旧成功证据计为完成。
