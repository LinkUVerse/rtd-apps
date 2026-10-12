# NET-04 CAP5 NC3B：所选包与完整 ABI 合同

按[B1–B3实施前设计](./20261005-move-package-capabilities-design.md)及[Task](../Task.md)实施；[此前状态](./20261005-current-state-before-move-package-capabilities.md)保留。B1／B2的所选合同编码与有限验证完成；B3全钱包目录、NC3C registry／revision／部署声明、NC4–6、CAP6及父NET-04仍开放，子项不另计98。

## 权威结论与编码

核对[Sui固定提交转换源码](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-rpc-api/src/grpc/v2/move_package_service/conversions.rs)及[本批官方／13本地源码摘要](../evidence/official/20261005-move-package-capabilities/manifest.json)：datatype.typeName使用查询storage地址，definingId使用真正定义来源；Module.contents未提供，不能把缺失当零字节码。datatype phantom显式boolean，函数泛型phantom转换未填写；引用缺失表示按值，UNKNOWN=0拒绝。升级originalId由源码读取bytecode地址，本批未实现独立Move解码器；版本1验证original=storage，升级仅记录service-declaration。双方网络合同同步这些边界，未修改只读SDK、RTD或部署脚本。

新增wallet-move-contracts来源审核模板、move-contract-shape严格比较及move-package-capabilities只读模块、binary夹具／两组测试和probe脚本。模板不从运行时响应生成：framework包含ID／UID／Balance／VecSet／Table及显式Kiosk依赖；Kiosk含五布局与take完整泛型、参数、引用和返回；PersonalKiosk含cap／Borrow、std Option及borrow_val／return_val；OriginByte发现五布局、执行两个private entry完整合同，包含TxContext及返回两个ID。DF空键dummy_field:bool来自当前RTD编译合同及已有BCS，不作为所有Move版本通则。每个所选符号完整比较，其他未选函数／Coin／staking／名称布局仍属于B3，不能称整个包或钱包全部ABI已验证。

abilities按唯一合法集合比较；字段顺序／position／name／类型树、泛型约束／phantom、visibility／entry／reference／参数及返回严格核对。重复模块／符号拒绝；signature≤16深度／4096节点／32实例化参数，超限明确incomplete budget，缺数组和非法类别为incompatible。类型地址最长32字节。模板深冻结，调用者不能污染下一轮期望；配置名称无审核合同明确unsupported，不套默认包。

每轮完整H0及必需u64水位前后包围；每唯一明确package执行GetObject完整canonical BCS／digest／Immutable→GetPackage→GetObject，关联storage／version、全部module集合和BCS typeOrigin，前后引用不变才接纳。实际bytecode从BCS取并逐模块SHA，descriptor和BCS独立SHA；这是结构关联，不是执行语义或部署签认。一个默认30秒总期限、2MiB／256模块／8192描述符预算，临时binary SDK只准Fullnode三只读方法／POST／明确URL，MVR空、omit credentials、redirect:error；leaf持有到body／trailer结算、取消及hash时会话失效不发表、迟到不发后续请求。本轮包去重，无跨轮成功缓存；包失败与ABI失败独立，依赖撤值传播。输出无ready／client／签名授权，catalogClosure=partial，registry／deployment／executionSemantics=not-verified。

## 验证与失败保留

[初始定向01](./20261005-move-package-capabilities-targeted-01.log)4文件134项、[RPC类型01](./20261005-move-package-capabilities-types-rpc-01.log)实际0。源码复核拆开预算与结构分类、限制类型地址，并补缺数组、复杂度、包模块／描述符预算、缺正例、有合法payload的失败trailer、预取消及共享期限反例。独立历史部署响应只用于审核OriginByte夹具，不当作当前服务通过。

[全量01](./20261005-move-package-capabilities-full-wallet-01.log)148文件1815项通过；最终[全量02](./20261005-move-package-capabilities-full-wallet-02.log)148文件1822项通过，较NC3A新增74项。完整钱包与五个能力脚本类型[01](./20261005-move-package-capabilities-types-final-01.json)／[02](./20261005-move-package-capabilities-types-final-02.json)两个实际子进程各0；格式01–03及[最终check02](./20261005-move-package-capabilities-format-check-02.log)实际0。探查时曾读取不存在configs/ts/tsconfig.json，外层混合读取0不当该检查通过；[读取诊断](./20261005-move-package-capabilities-read-diagnostics-01.json)保留，清点后真实完整检查采用现有tsconfig.dev.json。NC3A及更早各批失败记录原样保留。

真实同链评估[01](./20261005-move-package-capabilities-public-01.json)与最终[02](./20261005-move-package-capabilities-public-02.json)分别8次只读请求，HTTP均200、完整trailer通过；0模拟／签名／Execute。最终Fullnode末验height=615137，H0精确绑定。明确包0x2与已部署OriginByte各一次GetPackage，68／3模块的BCS及全部typeOrigin关联通过；版本均1。framework所选10布局／1函数、OriginByte发现5布局／执行2函数兼容；实际profile未配置Kiosk／PersonalKiosk／name，报告unconfigured，不能当这三类实链或业务回归通过。selectedConfiguredContractsCompatible=true仅代表本批目录中的已配置合同，catalog仍partial，不解除原资产／名称负项。

## 环境保护、来源及下一步

[指定合约脚本只读保护](./20261005-move-package-capabilities-history-01.json)最新debug源码与8产物验证、原22水位不变，连续0–173235／173236 markers，PID66145运行至上界386503、boundedExitCode=null；未restart／resume、未操作原交易保留根或重发。D5原严格marker／watermark拒绝仍需独立调查，本次通过不消除历史失败。

[来源清单](./20261005-move-package-capabilities-source-inventory-01.json)7本批文件、前NC1／NC2的17与NC3A的7逐项不变，一官方及13本地审核摘要吻合；产品1034文件SHA已保存。磁盘UI／background仍严格等于历史C9，本批没有新构建／Chrome，不能沿用旧产物结果。B3继续补全Coin／staking等全部所用布局和名称合同；NC3C再做registry／部署声明／revision，NC4独立账户扩展、NC5聚合／CAP6全局撤值、NC6当前产物与核心Chrome。父49/98、trial_ready=false。

## 本批文档末验

[合并原文及Task覆盖](./20261005-move-package-capabilities-merged-docs-01.log)实际0，13章／14原文／22 QA／21协议矩阵保留。[双方／来源末验01](./20261005-move-package-capabilities-document-verification-01.json)31文档／801本地链接／71共享H2，70逐字一致，1仅合法07→08链接编号；31唯一当前来源、一官方及13本地审核摘要再次一致。[三仓diff](./20261005-move-package-capabilities-diff-01.json)各实际0，既有dirty未清理。添加本段封存链接后重新派生总进度并另存最终02；父49/98、trial_ready=false，B3及其余必需合同继续推进。
