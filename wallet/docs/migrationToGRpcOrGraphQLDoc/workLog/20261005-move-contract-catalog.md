# NET-04 NC3B B3：全钱包固定codec与调用合同目录

按[B3.1–3编码前设计](./20261005-move-contract-catalog-design.md)及[Task](../Task.md)推进，原[当前状态](./20261005-current-state-before-move-contract-catalog.md)与[B1／B2七源码原字节](../evidence/20261005-move-contract-catalog-before/manifest.json)保留。B3目录编码、来源与本配置有限只读验证完成；完整部署签认／registry／revision、账户扩展、全局client／UI及当前产物验收仍必需，父NET-04不勾选，49/98、trial_ready=false。

## 目录范围与权威结论

[编码前清点](./20261005-move-contract-catalog-inventory-before-01.json)18个固定codec／类型／Move调用来源，并扫描整个产品src的实际AST；八个显式MoveCall恰好全部进入审核函数。用户任意NFT／Coin类型参数和事件payload仍opaque；Object／Transaction／Effects／Event是协议envelope，已有固定SDK、canonical BCS及digest核验承担，不能借包目录冒称所有用户合约或非Move协议布局通过。

[Sui及SuiNS六固定源码／38本地来源](../evidence/official/20261005-move-contract-catalog/manifest.json)审核新增合同。模板是源码定义，不由运行时descriptor生成。系统extra_fields是Bag，不因BCS同为UID＋size而写成Table；ValidatorMetadata实际Move名proof_of_possession及Url包装要按源码，wallet的扁平BCS标签不当ABI字段名。Url引用std::ascii::String，普通元数据／名称引用std::string::String，Option与VecMap／Entry泛型及abilities／phantom均完整比较。当前RTD空结构编译为dummy_field:bool，RTD和DisplayKey按该编译合同核验，并由当前实链响应证实。

[SuiNS固定Domain源码](https://github.com/MystenLabs/suins-contracts/blob/df19300b4bd5cf39fa5e0b48ce65fc0d8cd5e522/packages/suins/sources/domain.move)及[NameRecord](https://github.com/MystenLabs/suins-contracts/blob/df19300b4bd5cf39fa5e0b48ce65fc0d8cd5e522/packages/suins/sources/name_record.move)查明两者copy／drop／store与完整字段；配置名称包须实际匹配这两个结构，不猜默认部署。最新SuiNS长度235，固定Sui Rust及当前RTD Rust／钱包仍200；双方文档明确它是版本／本地格式策略差异，结构兼容不推导语法一致。本批没有把235直接替换为RTD可用值，也没有声称名称registry已部署／业务成功，后续C独立校验这些声明。

| 合同领域 | 固定审核布局／调用 | 依赖与边界 |
| --- | --- | --- |
| framework | ID／UID／Balance／VecSet／Table／RTD／TxContext共7 | 原生基础，独立于可选Kiosk配置 |
| standardLibrary | Option／UTF8 String／ASCII String共3 | 当前RTD 0x1，完整phantom与泛型 |
| readerSupport | Bag／Versioned／VecMap／Entry／TableVec／Url／Clock共7 | framework及标准库；不混同扁平字节编码 |
| coins | Coin／Withdrawal共2、redeem_funds完整函数 | Withdrawal的store泛型及u256 limit、隐式TxContext参数也核验 |
| staking | 系统wrapper、两个inner与两个parameters、ValidatorMetadata／Validator／Set／Wrapper、Pool／Rate／StakedRtd／StorageFund／Subsidy共14；两staking entry | framework／标准库／readerSupport／Coin；ABI存在不当活跃仓位或奖励业务证明 |
| dynamicFields／display | Field／Wrapper共2、DisplayKey共1 | 精确泛型／abilities，任意value和用户类型参数保持opaque |
| Kiosk／PK／OriginByte／names | 前批审核Kiosk5、PK2／2函数、OB发现5／执行2函数；名称2 | 明确可选配置；OB和PK各自审核所用固定Kiosk合同，不从名字推导部署存在 |

新move-contract-template提取模板助手、wallet-reader-move-contracts存新增审核定义、move-contract-catalog检查每个递归类型引用都有审核声明及同名模板一致。全配置目录50唯一布局／8函数，当前profile46／6，非可选原生36／3；catalogClosure=reviewed-wallet-contracts只表示钱包内置固定codec／调用目录，customMoveTypes=opaque、protocolEnvelopes=sdk-pinned。报告仍无ready／client／签名授权，registry／deployment／executionSemantics未验。领域逐项失败与传递依赖保持；Coin ABI失败不撤销无关名字／Kiosk，标准库失败会撤下其依赖reader。原完整BCS／全部module／typeOrigin／稳定引用、总期限／2MiB／leaf及迟到fence继续，仍只三种只读方法，无跨轮成功缓存。

## 验证及失败保留

[首次定向01](./20261005-move-contract-catalog-targeted-01.log)实际1：125项中123通过／2失败，另两份历史副本测试被Vitest文件匹配扫描，因未带依赖而导入失败。原七文件改为保持原字节的.ts.txt副本，未删除历史证据或扩大测试排除。目录最初在signature预算检查前JSON.stringify，循环树抛普通TypeError；改为先受预算遍历再生成比较字符串，仍拒绝循环。PK现也审核固定Kiosk本体，Kiosk ABI变动使其自身unsupported；纠正原只预期dependency状态的断言，未放宽ABI。查找过两个不存在的同名源码文件，也在清点诊断中保留，实际转账代码已定位，不把rg诊断当通过。

[修正定向02](./20261005-move-contract-catalog-targeted-02.log)3文件125项通过，[RPC类型01](./20261005-move-contract-catalog-types-rpc-01.log)实际0。新增独立Move原文字段／position／abilities／phantom／泛型核对38结构、完整三函数、类型引用／重复模板／循环反例及三个实际binary SDK领域隔离反例；随后补全产品AST与八显式调用的一一对应守卫，避免后续新增调用漏目录。最终[全量01](./20261005-move-contract-catalog-full-wallet-01.log)149文件1874项通过，比B1／B2新增52。[完整钱包／五能力脚本类型](./20261005-move-contract-catalog-types-final-01.json)两个实际子进程各0；格式01–04及[最终check01](./20261005-move-contract-catalog-format-check-01.log)实际0。所有首次失败和历史批次失败保留。

[真实同链只读报告](./20261005-move-contract-catalog-public-01.json)实际终态0、14请求且HTTP均200／完整trailer通过，H0绑定、Fullnode末验619330。当前0x1／0x2／0x3及部署OB四唯一包去重关联、模块数22/68/11/3，前后对象引用、BCS／bytecode／全部typeOrigin核验；当前目录46布局／6函数、九配置领域全部ABI兼容，Kiosk／PK／names三个独立配置unconfigured。OB依赖的实际Kiosk已单独审核，但不代表未配置原生Kiosk业务或PK／名称实链通过。0模拟／签名／Execute，不当新Chrome、活跃质押／非空NFT或奖励发送的业务验收。

## 环境、来源与剩余任务

[指定合约脚本只读回放保护](./20261005-move-contract-catalog-history-01.json)最新源码及8 debug验证，原22水位不变，连续0–179191／179192 markers，PID66145仍运行、上界386503／无终态；未restart／resume、未操作原交易保留根或重发。D5旧严格拒绝调查保持，不能因本次正例消除历史失败。

[当前来源清单](./20261005-move-contract-catalog-source-inventory-01.json)11当前模块／测试／probe（4新增、原7中5明确修改）、7原源码完整副本、前NC1／NC2的17和NC3A的7不变；6官方及38本地审核摘要一致，产品1038文件SHA保存。磁盘双bundle仍严格等于历史C9，未新构建／Chrome；原B1／B2source hash属于保存的旧源码，不冒作当前源码通过。下一按NC3C做独立registry／revision／部署声明、NC4账户扩展，再NC5／CAP6全局和NC6新产物与核心链路，全部原RPC／TX／TRY／QA／REL余项保持。

## 本批文档末验

[合并原文／Task覆盖](./20261005-move-contract-catalog-merged-docs-01.log)实际0，13章／14原文／22 QA／21协议矩阵仍完整。[文档／来源01](./20261005-move-contract-catalog-document-verification-01.json)33文档／835本地链接／72共享H2，71逐字一致、1仅合法07→08链接编号；35当前唯一来源、7保存原源码、6官方／38本地审核摘要均通过。[三仓diff](./20261005-move-contract-catalog-diff-01.json)各实际0。加入本段后重新派生总进度并保存最终02；保留全部失败，父49/98、trial_ready=false，后续NC3C–6／CAP6及原必需项继续。
