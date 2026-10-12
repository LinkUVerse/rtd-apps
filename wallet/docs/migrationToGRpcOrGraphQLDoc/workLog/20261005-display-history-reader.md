# 2026-10-05：历史Display读取与GraphQL模板依据

本批为D3，附属于RPC-03／NET-04等原98项任务，不单独增加父任务完成计数。本批编码与默认features下库回归已完成：Reader36项、GraphQL247项通过，两个当前源码证明sourceUnchanged=true。新历史表／查询服务尚未部署，未执行认证回放或钱包／Chrome新版验收。

## 权威语义

再次读取并保存Sui固定commit c860146823abcedef45a1b5a9c766920be98a29c的[display resolver](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-indexer-alt-graphql/src/api/types/display.rs)与[MoveValue渲染](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-indexer-alt-graphql/src/api/types/move_value.rs)，见[保存manifest](../evidence/official/20261005-display-resolver/manifest.json)。官方v1读sum_displays当前行；v2沿用scope解除root版本限制，且优先渲染。RTD在该语义上增加按S读取v1发布事件及独立连续覆盖，属于本地快照一致性扩展，不能称为官方已有历史合同。

## 编码内容

新增HistoricalDisplayKey(type,S) loader：一次参数化UNNEST／LEFT LATERAL查询同时读取历史行、连续coverage、hist管线watermark、数据库genesis及相关marker；保留未知类型对应行以区分已覆盖无模板与缺失历史。查询使用闭合类型范围和完整checkpoint／transaction／event降序；根据ordinal处理重复及多S请求。S进行BIGINT checked转换；BCS ID／发布版本与行元数据必须一致。

查询要求coverage从0覆盖S、hist自己的watermark与端点一致、genesis与chainId／genesis marker一致、sourceId／generation完整，且S marker存在。独立immutable前缀不因当前writer epoch提升而被否定。该校验依赖D2已验证的数据库连续coverage触发器，不在每次查询扫描全历史或伪装为可携带证书。

GraphQL要求indexed checkpoint scope。v1采用历史事件；v2保持同S优先且只移除root界限，核对registry ID／类型／对象版本／digest及版本来源checkpoint。两种basis通过union明确区分v1 publishedVersion与v2 objectVersion；提供S、类型、模板ID、来源位置／摘要、SHA256内容身份及历史来源覆盖。SHA不是链上摘要或认证证书。UInt53出参显式限制JavaScript安全整数。

历史缺口不能返回null，v2有效也不能绕过完整历史覆盖；无checkpoint的execution/stream scope失败。存在模板而资产layout不可取同样失败，不冒充无模板。旧sum_displays及其它旧loader消费者保留。

## 验证边界

Reader新增7项测试计划覆盖完整顺序、多ID版本重置、未知/重复/未来请求、缺失覆盖、genesis／watermark差异、事件BCS与元数据差异、事务提交可见性，以及1025事件热点／稀有／缺失数组查询。GraphQL新增10项测试计划（其中2项实际PG resolver）覆盖模板选择、basis、root／execution scope及实际GraphQL union字段。最终结果见下文；覆盖完整库而不是仅筛选新增测试。

wallet basis准入、availableRange／能力合同、真实认证回放与最新debug受控部署继续归D4–D6。现有开发服务保持运行，本批未启动新dev、未模拟或广播交易。

## 中途发现与修正（保留失败证据）

初次check发现Reader错误包装与GraphQL错误转换不匹配，已改为显式anyhow上下文／Reader包装；check-01、check-02保留。GraphQL测试编译发现缺diesel-async测试依赖和Schema.execute与数据库execute方法冲突，已补既有workspace依赖并使用Schema::execute；schema-export、schema-export-02保留。schema-export-03曾成功生成SDL，不能由此推断出参序列化正确。

完整GraphQL第一轮247项为245通过、2失败：新增union字段请求暴露Digest仅为输入scalar，出参会panic；另有新增27项Display字段的范围映射snapshot未更新。已把所有basis digest字段改为checked 32字节后规范Base58 String出参，并在实际GraphQL字段测试断言H0／transaction／object digest。范围snapshot逐行确认只有新增Display字段，原body未删除；assertion_line为原有行位置更新。失败.snap.new原文保存于evidence/20261005-display-range-snapshot-failure.snap.new，未被删除而丢失证据。

第一轮GraphQL源稳定性因产生.snap.new而失败；同期Reader第二轮虽然36项和实际SQL均通过，但wrapper的sourceUnchanged=false，因此不作为当前稳定源码证明。第一轮Reader36项sourceUnchanged=true保持为当时记录；最终稳定源码验证另行记录。

实际fixture有1025事件，7参数请求包含热点、稀有、缺失及重复键；第二轮Loader实际60.072958ms（含连接与解码），同一数组参数UNNEST／LATERAL的EXPLAIN ANALYZE SQL实际0.601ms，命中hist_displays_type_position，loops=7。此为独立TempDb测试规模，不是生产库SLA或认证回放性能。最终源码测试完成后再记录本批通过结论。

## 最终通过证据

- [Reader全库证明](./20261005-display-reader-tests-03.json)及对应.log：36通过、0失败、0忽略、0过滤；sourceUnchanged=true。
- [GraphQL全库证明](./20261005-display-graphql-tests-02.json)及对应.log：247通过、0失败、0忽略、0过滤；sourceUnchanged=true。新增7／10项中分别6／2项实际PG函数；其它新增测试为整数、模板选择、scope和字段合同，不能全部称为PG测试。
- schema-export-04：默认SDL测试1通过；完整GraphQL回归也包含SDL／范围registry snapshot。新字段27项范围snapshot已经检查，无原有body删除。
- Reader最终fixture：1025事件／7请求，Loader15.720208ms（连接／查询／BCS与metadata校验），相同数组参数EXPLAIN ANALYZE执行0.466ms，历史类型位置索引loops=7，无历史表全扫／排序。详细计划在Reader最终.log。只证明本次TempDb规模，不外推生产SLA。

两个证明与本批最终rtd HEAD49a05a0de323b45a49d067a855c419e98d071afc、diff SHA e91f834f97d8fa0535a649b9be8d0861e2f86ef7f5ee5e1109abede54a448c1f及所有新增／修改文件SHA一致。Reader第一轮属于此前代码记录，第二轮稳定性失败不用于当前通过；后续阶段变更源码后需要新阶段对应证明，不能挪用本次摘要。

双方03／06／07（archive02／05／06）已追加同一D3实施段，逐段SHA一致，见[本批汇总证明](../evidence/20261005-display-history-reader-completion.json)。Task和totalProgress更新，父任务48/98、trial_ready=false保持。

## 后续依赖

D4必须把hist_displays纳入GraphQL能力／availableRange与钱包完整快照准入，查询及校验typed basis／H0／source绑定／S与来源／版本语义，保留整个读取的失败与取消预算。现有新basis字段范围snapshot的空依赖映射只记录当前注册表，不能充当D4覆盖完成。v2优先同样需要已认证同S的对象历史和v1完整覆盖。

D2实际认证回放、D5认证中断恢复／未发布编辑／实际跨S模板与D6最新8个debug构建和保留数据部署、钱包／Chrome回归仍待执行。新历史表和新resolver没有部署；原数据、genesis、配置、交易journal保持，未启动新dev／未模拟或广播交易。继续推进目标。

文档收尾验证：13章／14原文／22QA／21线协议和本批相对链接全部通过；总进度内嵌workLog/current-state时，原相对日志链接曾被当成根目录链接，已在生成器按文件所在目录重定位并实际检查目标存在。该修复不改变任务勾选或比例。Rustfmt、新增代码与SDL／snapshot的diff检查、指定脚本py_compile通过。源码与两个最终证明再次一致。
