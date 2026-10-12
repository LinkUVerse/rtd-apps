# NET-04 NC3B B3：全钱包合同目录实施前设计

承接[B1／B2](./20261005-move-package-capabilities.md)，先保存原7源码及[当前状态](./20261005-current-state-before-move-contract-catalog.md)，以[编码前固定codec／调用清点](./20261005-move-contract-catalog-inventory-before-01.json)推进。每个钱包内置固定BCS解码、动态字段类型、确定性Display键和显式Move调用都需要完整来源合同；协议Object／Transaction／Effects／Event envelope继续由固定SDK及已有canonical／digest验证承担，用户NFT／Coin泛型类型及事件payload保持opaque，不凭任意bytes推导ABI或声称验证所有用户合约。

| 子项 | 编码前状态 | 交付 |
| --- | --- | --- |
| B3.1 | 待实施 | 来源审核的Std Option／UTF8及ASCII String，Coin／Withdrawal／RTD／TxContext及redeem_funds，动态Field／Wrapper、Bag／Versioned／VecMap／Entry／TableVec／Url／Clock及DisplayKey |
| B3.2 | 待实施 | 完整系统v1／v2、ValidatorMetadata／Validator／ValidatorSet、pool／rate／StakedRtd／Wrapper／StorageFund／Subsidy及两staking entry；按实际Move类型，不因BCS压平成Table／string混同Bag／Url |
| B3.3 | 待实施 | 配置名称Domain／NameRecord精确字段／abilities，现有格式／过期及registry合同分离；catalog递归type引用闭包与源码独立反例，全量／类型／最新真实只读报告及双方同步 |

将模板构建助手单独提取，保留原所选模板；拆分framework／standardLibrary／readerSupport／coins／staking／dynamicFields／display／Kiosk／PersonalKiosk／OriginByte／names，领域失败按实际依赖传播，Coin函数不兼容不能掩盖或撤销无关名称／Kiosk。OriginByte显式依赖所需固定Kiosk完整合同，即使profile未配置原生Kiosk仍审核实际0x2依赖；不把任意可选部署推导为存在。每个选择的type树引用必须在本轮合同集合有来源审核定义；同名模板冲突拒绝。输出只可声明reviewed-wallet-contracts目录闭包，仍无ready，registry／revision／部署／执行语义与运行业务集合归NC3C及后续，全局client发布归NC5／CAP6。

[Sui及SuiNS六固定Move原文](../evidence/official/20261005-move-contract-catalog/manifest.json)与当前RTD源码分别审核。最新SuiNS Domain上限235，而固定Sui Rust／当前RTD Rust和钱包是200；这是版本及本地格式策略差异，不因ABI布局相同就修改RTD语法或冒充235可用。Domain／NameRecord的abilities与结构取固定Move并对照当前RustBCS；实际配置还必须GetPackage完整匹配，registry部署和运行名称业务仍未验证。

继续使用B2完整对象BCS／typeOrigin／稳定引用与一个总期限／2MiB／共享leaf，默认基础只读包含当前RTD明确0x1／0x2／0x3；可选PK／OB／names仍严格显式配置。最新源码debug与原回放只读核验，不restart／resume／清genesis，不操作原交易保留根。原7文件摘要已有完整副本，改动会明确列入本批来源，不把旧源码证据描述成当前构建；无新Chrome则明确未验。B3完成也不自动勾父NET-04或其余98清单；49/98、trial_ready=false。
