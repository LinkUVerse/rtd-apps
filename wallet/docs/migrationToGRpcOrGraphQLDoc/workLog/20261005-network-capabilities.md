# NET-04 CAP5 NC1／NC2：schema及独立领域能力

实施前[NC1–NC6设计](./20261005-network-capabilities-design.md)及Task先于编码；父NET-04开放，不新增98计数。前批持久观察有限合同已封存，见[完整旧批日志](./20261005-network-observations.md)及[27文档／727本地链接／68共享段落封存检查](./20261005-network-observations-document-verification-final-02.json)。

## 权威来源与范围

[官方来源manifest](../evidence/official/20261005-network-capabilities/manifest.json)保存Sui schema／ServiceConfig、GraphQL官方自省及GraphQL-js17固定源码原文／SHA；原三源manifest另存。schema支持、同链、coverage及业务fixture不同层级。NC1／NC2是可复用只读探测模块，NC3服务正例／package／registry、NC4账户历史、NC5完整聚合／全局client发布及NC6新产物／Chrome仍未完成；CAP6状态、缓存撤值及跨操作负面身份仍必需。

## 编码与依赖

新增GraphQL17.0.2直接依赖，已在离线store存在，pnpm安装终态0；[安装输出](./20261005-network-capabilities-dependency-01.log)包含peer警告，不冒充生产构建检查。[修改前包与lock摘要及备份](./20261005-network-capabilities-dependency-before-01.json)保留；钱包package仅新增graphql键、其余JSON完全一致，lock相对本批前仅5行变化。只读SDK及RTD源码未修改。

导出现有asset／balance／metadata／indexed的查询片段与name coverage以复用；业务方法／选择语义保持。新增十一份明示原生查询合同、基于当前RTD SDL的审核基准、类型／输入／union／enum／oneOf／默认literal比较、H0＋全schema实际SDK查询与预算／迟到fence。仅契约声明，无默认MVR或可执行client，没有自动探测模拟／执行方法。八独立领域复用原reader coverage和GraphQLSnapshot.open，staking无Display multiGet独立；一个总期限、过滤逐项检查、错链优先、取消／关闭／迟到不发表。输出各领域声明S与明确负状态，schema成功不能证明资产／packages或业务完成。

## 失败、修正与每轮证据

[前置01](./20261005-network-capabilities-prerequisites-01.json)native自省200，accountHistory的data:null被检查器误用items导致AttributeError；[02](./20261005-network-capabilities-prerequisites-02.json)实际200／BAD_REQUEST，源码只允许accountHistory／Coverage单根，所以NC4不要求通用自省。

基准[生成01](./20261005-network-capabilities-schema-generation-01.log)缺合同名诊断而失败；[02](./20261005-network-capabilities-schema-generation-02.log)定位本批新清单把multiGetObjects误写成MoveObject fragment。实际reader原本正确asMoveObject；改清单后[03](./20261005-network-capabilities-schema-generation-03.log)十合同通过。新增无Display staking multiGet后[04](./20261005-network-capabilities-schema-generation-04.log)十一合同通过；默认值／oneOf补充[05](./20261005-network-capabilities-schema-generation-05.log)通过。不能从运行时远端生成期望绕过比较。[最终基准检查](./20261005-network-capabilities-schema-baseline-check-03.log)十一合同与当前SDL SHAade0471a6dafd8c2aed429013fc4820212b02b389f5e9c622ebe2ed60162f744一致。

[schema单测01](./20261005-network-capabilities-schema-tests-01.log)happy-dom将import.meta.url变为非file，suite未启动，不计测试通过。改用已确认cwd下SDL文件后[02](./20261005-network-capabilities-schema-tests-02.log)110/131：测试正例误将自省的mutationType字段匹配为mutation操作，造成21失败；修正词边界，[03](./20261005-network-capabilities-schema-tests-03.log)129/131，两个故障fixture改变了Address interface参数而生成非法整个schema。保留完整schema拒绝，改为合法Query参数变化以验证单合同降级，[04](./20261005-network-capabilities-schema-tests-04.log)5文件131项通过。RPC类型[01](./20261005-network-capabilities-types-rpc-01.log)测试故障赋值readonly类型失败，限定故障fixture显式cast后[02](./20261005-network-capabilities-types-rpc-02.log)终态0，未放宽生产数据类型。原型constructor新增必填input字段的反例已覆盖；生产模型用无原型字典／hasOwn。

[NC1＋NC2定向](./20261005-network-capabilities-targeted-01.log)8文件191项通过，后续补充oneOf、默认值与缺失元数据三个反例纳入最终全量。[全量01](./20261005-network-capabilities-full-wallet-01.log)145文件1709项；[02](./20261005-network-capabilities-full-wallet-02.log)1711项；末验补充后[03](./20261005-network-capabilities-full-wallet-03.log)145文件1712项全通过，新增schema35＋领域17。

[完整钱包／新增三个脚本类型实际终态](./20261005-network-capabilities-types-final-01.json)两组子进程分别0，包含生成器及两探测脚本；前RPC检查0和较早钱包／脚本检查保留，但不替代最新。检查脚本两次apply预期片段因格式化不匹配而未写任何文件，读取准确片段后修正，不覆盖文件或夹具结果。

## 真实只读有限验证与不通过项目

[原生schema首轮](./20261005-network-capabilities-public-schema-01.json)十合同、实际H0与200通过，0模拟／签名／执行。[领域01](./20261005-network-capabilities-public-domains-01.json)十一合同、十四次只读请求，六领域snapshot-verified，assets incomplete／partial、names unconfigured，allDomainsVerified=false。末审补充时误强制新版deprecated-input自省扩展，[领域02](./20261005-network-capabilities-public-domains-02.json)终态1、首请求partial，整轮不通过。

[真实元数据支持](./20261005-network-capabilities-schema-metadata-support-01.json)完整同H0：__Type有isOneOf，但inputFields无includeDeprecated；__Field.args无includeDeprecated；__InputValue只有name／description／type／defaultValue。按[GraphQL-js17官方可选参数源码](https://raw.githubusercontent.com/graphql/graphql-js/v17.0.2/src/utilities/getIntrospectionQuery.ts)保留强制oneOf及boolean完整性，inputValueDeprecation=false且报告明确not-requested；不强行启用服务不存在的扩展，不把该范围宣称已验证。标准defaultValue比较仍保留。[领域03末验](./20261005-network-capabilities-public-domains-03.json)实际终态0、十四只读请求、十一合同兼容，六领域S288451声明快照通过，assets仍partial、names仍缺registry，allDomainsVerified=false；0模拟／签名／Execute。不能以CLI完成评估当全部领域通过、非空业务或当前浏览器验证。

## 运行保护与下一步

[开始只读保护](./20261005-network-capabilities-history-01.json)连续0–153786／153787 markers，原22水位不变、最新源码及8 debug严格匹配、PID运行，上界386503、无终态。[末验](./20261005-network-capabilities-history-final-01.json)连续0–160183／160184 markers、原22水位不变、最新源码／debug验证及PID运行通过，boundedExitCode=null；合约部署脚本不变，未重启／提前resume，D5旧严格拒绝调查不消除。

此批未启动扩展、未触碰原11条实际交易的保留根／journal，未签名或重发；旧C9构建／Chrome仅是上一稳定产物。新源码／lock需要NC6新构建及实际Chrome建立证据，不能沿用旧C9为新源码产物通过。NC1／NC2本批有限合同完成，其他必需项与父49/98、trial_ready=false保持；下一步依设计做native方法／package／registry及账户历史，再接全局状态与新产物。

## 本批封存末验

[最终SDL基准](./20261005-network-capabilities-schema-baseline-final-01.log)十一合同实际终态0；[最终格式检查](./20261005-network-capabilities-format-check-01.log)实际0。[来源末验](./20261005-network-capabilities-source-inventory-final-02.json)17源码／脚本／依赖文件及四官方原文摘要核对，产品来源1026文件；磁盘UI／background仍严格等于上一稳定C9，newBuildCompleted=false。[三仓diff检查](./20261005-network-capabilities-diff-final-01.json)逐仓实际0。[文档封存01](./20261005-network-capabilities-document-verification-final-01.json)27文档／736本地链接／69共享段落，68逐字一致，1仅合法07→08矩阵编号链接差异；来源17项保持。加入封存链接和派生总进度后再做02最终链接检查；此前失败及范围均保留。父49/98、试用未就绪，不以子项和声明快照替代完整验收。
