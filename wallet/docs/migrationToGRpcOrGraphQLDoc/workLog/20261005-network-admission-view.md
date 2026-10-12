# CAP6 F1a–b：只读状态视图与独立发布配置选择

按[原NC5／CAP6设计](./20261005-network-capabilities-aggregate-design.md)、[17来源接入审计](./20261005-network-admission-global-pre-audit.md)及[F1–4细化](./20261005-network-admission-global-design.md)先建立接入合同。本批只完成F1a–b的编码与有限验证；F1c–d、F2–4、NET-04父及试用门槛均保持开放，49/98（50.0%），trial_ready=false。

## 编码前保留与源码范围

修改共享Context前已保存[原字节与SHA](../evidence/20261005-network-admission-view-before/manifest.json)及[当前状态](./20261005-current-state-before-network-admission-view.md)。本批七份来源为core状态类型／Context、wallet投影及测试、发布registry及测试、合成声明夹具；[当前清单](./20261005-network-admission-view-source-inventory-01.json)逐份记录绝对路径和SHA。

NC5当前57份来源全部不变；加七份成为64份当前能力／视图相关来源。17份接入审计输入中16份未变，只有共享Context按保存的原字节有意增加可选字段。全部历次原字节保留由19增至20份，不能用新SHA覆盖旧批证明。产品1056文件SHA `c61beb5851e73eb5874d2174d26b2097886395e2448ad376d0f6eeac883222cb`；此前1051文件NC5产品SHA属于历史整体快照，其57份聚合来源仍逐字一致。

## F1a只读能力投影

[core纯类型](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/core/src/rpc/capability-types.ts)没有反向导入wallet；[Context](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/core/src/rpc/WalletRpcContext.ts)仅增加可选`readCapabilities`。原configured／hasFullnodeSession继续表示原有配置／会话语义，未提升成整个网络ready；尚无Provider赋值或业务授权依赖。

[投影实现](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/shared/rpc/read-capability-view.ts)只接受本binding／cacheKey下的新鲜报告，检查根及四族绑定、schema／Move子报告绑定、两个身份bookend三角色及其配置状态、canonical H0、各domain proof所属session。已知canonical异链保持chain-mismatch，不兼容字符串保持incompatible；拒绝跨session／回到同profile继承旧报告、关闭会话、负时间及擅自升级未验证范围。

视图只复制八个GraphQL领域、Native只读白名单、十二个Move组及约定状态字段，复制后深冻结，不冻结或共享调用方报告。状态／原因使用封闭枚举，包IDcanonical、账户window／计数／布尔字段检查，不投影任意额外组、客户端、选择器、响应／ABI hash、账户hash、opaque snapshot、交易或账户payload。GraphQL各领域仅自己的checkpoint／digest，各领域之间不共用S；账户coverage-only与完整owner有限reader结果分别显示not-probed／scoped-window-verified，allAccountHistoryVerified固定false并拒绝来源擅改true。

validating、unavailable及quarantined只描述本session观察。quarantined视图不等于持久负面已提交；无service build／revision签认、跨域S或执行证明。缺审核声明、partial、syncing、未配置与其它身份入口暂不可用均保持原有负项或降级，不凭Fullnode正例补其它角色。

## F1b受控发布registry

[选择器](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/shared/rpc/reviewed-deployment-registry.ts)仅消费调用方另外控制的发布配置原文，无IO、默认环境、SDK入口或可信pin自动生成。注册表根精确`schemaVersion:1`／entries，compact JSON重编码一致；UTF8总量≤1MiB／≤16条。每条精确profileBindingKey／json／trustedSha256，key≤16KiB，声明≤64KiB，SHA为64位小写hex，所有绑定去重；重复JSON key／其它数字或转义拼写、不合法未选条目也拒绝。

只取完全相同`networkBindingKey`的声明；revision、generation、入口或包变化均不借用其它条目。缺注册表或当前绑定保持unreviewed。选中条目先复制冻结，再复用既有`verifyReviewedDeployment`：校验独立预置pin与声明字节一致、声明自身绑定、完整包／模块及名称锚合同。格式、预算、重复绑定、trust、binding、declaration、registry错误只返回固定原因，没有来源原文／消息输出。未选择条目只受注册表格式／预算校验，不称其部署已审核。

测试中的声明pin由[显式合成夹具](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/tests/unit/rpc/reviewed-deployment-fixture.ts)从测试字节计算，不能代替实际独立发布权威。实际dev仍没有受控独立发布pin、可选Kiosk／PK／names部署及服务build／revision签认，本批没有自行补造这些门槛。Webpack输入、UI注入及后台读取配置归F1c–d，尚未实施。

## 验证与失败证据

[最终检查](./20261005-network-admission-view-checks-final-01.json)记录工具实际退出码与日志SHA：

| 验证 | 实际结果 | 证据 |
| --- | --- | --- |
| 新视图／registry场景 | 新增75项 | 两个新增test文件；63项首轮不代替最终源码 |
| 四文件定向 | 4文件153项全部通过，exit0 | [targeted03](./20261005-network-admission-view-targeted-03.log) |
| 完整钱包当前源码 | 157文件2151项全部通过，exit0，89.21秒 | [full-wallet01](./20261005-network-admission-view-full-wallet-01.log) |
| RPC含共享core类型 | exit0，无诊断 | [rpc03](./20261005-network-admission-view-types-rpc-03.log) |
| 完整钱包类型 | exit0，无诊断 | [wallet03](./20261005-network-admission-view-types-wallet-03.log) |
| 六份新增文件格式 | exit0 | [format01](./20261005-network-admission-view-format-check-01.log) |

正例不是用mock替代聚合报告：使用生产NC5聚合器、显式owner夹具及RTD SDL／SDK gRPC／BCS fixture生成四族探测结果，再投影视图；受控合成registry选择后进入真实生产聚合器，得到有限release-pin-matched。原生method不包含Simulate／Execute；这仍属于协议夹具验证，未跑本批实链／Chrome业务。

首轮readonly夹具类型失败、后续泛型推导诊断、package-id反例夹具失败及两次patch锚不一致均见[首次诊断](./20261005-network-admission-view-diagnostics.md)，原日志保留。没有放宽预算、换单worker规避或删除失败记录。

## 双方文档与环境边界

双方网络章新增同一F1a–b合同段，Task细项据真实范围更新；13章／14原文、所有来源、双方共有段及本地链接使用[本批精确验证器](./20261005-network-admission-view-document-verifier-01.py.txt)核验，结果见[最终文档验证](./20261005-network-admission-view-document-verification-final-01.json)。既有14份官方原文／59份本地权威源码保持不变；本批属于本地钱包状态／受控配置政策，没有新的Sui协议裁决。

本批没有启动或修改dev服务、部署合约、变更RTD／只读SDK基线、重建genesis、改写journal／交易根、恢复或重启受保护PID66145。现有debug／合约脚本约束继续有效。C9磁盘产物只按历史原SHA核验，当前新源码尚未构建扩展／打开Chrome；此前真实NC5 owner5条事实只对应未变的聚合57来源范围，不能作为本批状态视图或全局隔离的实际浏览器验收。

下一步先完成F2精确负面分类／strict独立存储，再按F1c–d／F2c–d接入当前会话和后台门槛及F3全局撤值；否则可选状态视图不能阻止跨操作、重启后的旧绑定。继续以接口／核心链路可试用优先，不把未完成的NFT／发送全部／活跃质押、正常CA、全故障矩阵与环境签认勾为通过。
