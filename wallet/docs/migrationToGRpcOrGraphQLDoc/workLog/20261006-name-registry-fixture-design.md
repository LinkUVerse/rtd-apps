# QA-A15 当前链名称 registry 验收夹具

当前78/98，packages.name尚未配置。当前RTD原生NameService对Unknown链明确Unimplemented，不能伪称localnet具有原生名称正例。钱包生产NameReader已经显式按profile中的同链package／forwardRegistry／reverseRegistry读取固定GraphQL snapshot，保持Fullnode新鲜高度／Clock／到期／lag检查。本批不修改或绕过这些规则。

以[Sui固定NameRecord源码](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-name-service/src/lib.rs)和当前rtd-name-service为依据，部署受控dev注册表夹具：Domain／NameRecord真实Move类型和规范BCS，两个真实Table、共享Registry、受控AdminCap和真实RegistrationNFT。它用于验证显式registry adapter，不声称完整生产SuiNS注册／竞拍／收费协议已部署。

- [x] N1 官方／RTD Domain、NameRecord、leaf-parent NFT绑定、expiration和当前reader路由对齐，[两原生方法实际UNIMPLEMENTED及规范Clock](./20261006-name-registry-preflight-01.json)已记录，0模拟／签名／执行。
- [x] N2 合约源码及材料仅位于link-u-smart-contract/all-in-one-deploy/localDeploy；[最新RTD源码debug编译三个模块](./20261006-name-registry-build-01.json)，依赖仅0x1／0x2，完整源／bytecode／installed来源／H0绑定。当前构建通过，public entry冗余lint警告已保留，尚不代表发布或名称接纳。
- [x] N3 新受控package单次publish及[原摘要独立恢复](./20261006-name-registry-publication-recovery-01.json)，checkpoint1012670；只持有本任务dev账户的AdminCap。有效、已到期、无目标、有效leaf、父NFT不匹配、缺失、正向／默认反向均构造真实链记录，单次seed checkpoint1013109并[核验原BCS、五正向字段／两反向字段及缺失字段](./20261006-name-registry-seed-recovery-01.json)。0恢复签名／模拟／Execute；新名称profile及索引正例仍待。
- [ ] N4 独立profile扩展名称pin声明、package与两registry实际同链审核；待真实GraphQL覆盖和新鲜高度要求成立后，生产reader及当前Chrome正向／默认反向／到期／缺失／lag／wrong-H0与最终收件地址确认验收。禁止把fresh对象或受控响应伪装成已经索引的正例。
- [ ] N5 改名／续期及旧默认名撤销、URL／registry变动、迟到结果拒绝、当前源与父合同独立审核后才勾QA-A15；原profile／原pending／原目录保留。

发布积压仍是N4的实际前置条件。若当前GraphQL不能满足minimumCheckpoint，记录lag并继续环境修复，不能下调名称接纳门槛。

## 正式部署门禁补充

已完成N1–N3的三模块夹具只支持低层NameRecord adapter字段验证，不能满足当前deployment-contract的suins-v1根门禁。后者明确要求package::suins::SuiNS共享根、RegistryKey<registry::Registry>动态字段、registry::Registry的两个Table原布局及独立认证package声明。保留原夹具和全部原交易；原profile不添加未经完整审核的name pins。

- [ ] N6 在独立wallet-name-root-fixtures补五模块布局，根与注册表只提供friend访问，AdminCap控制seed／改名／续期／default更新；使用当前debug编译并验证实际ABI／规范根字段BCS与生产verifyNameRegistryRoot／Field，完整认证package和独立声明成立后才准备正式profile。不能新增宽松fixture模式绕过固定门禁。

- [x] N6a [五模块debug构建](./20261006-name-root-build-01.json)及单次发布checkpoint1014819／seed1015260完成；原三模块夹具保留，原16／17笔源账户尝试复核后才新增两笔执行。
- [x] N6b [实际ABI符合两份生产合同及10项变异拒绝](./20261006-name-root-abi-01.json)通过；[原摘要恢复、根字段及五正向／两反向／缺失](./20261006-name-root-seed-recovery-01.json)规范BCS通过，生产根／字段验证器另外拒绝10项错误UID／owner／version／type／key／长度／Table绑定。只构造临时候选profile用于验证函数，原profile不变，未创建trusted声明。
- [ ] N6c 按[完整认证声明清单](./20261006-name-certified-release-design.md)完成新package的genesis锚定认证、与原五pin合并及独立声明，再完成索引／Chrome准入。N6a／b不代称此项通过。
