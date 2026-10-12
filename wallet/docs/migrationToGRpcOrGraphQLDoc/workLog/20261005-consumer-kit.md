# NET-10：现代Kit消费与钱包联检

按[编码前设计](./20261005-consumer-kit-design.md)推进。M1–M3在本批明确范围内实现并验证；M4剩余统计服务／M5完整Explorer构建未完成，父NET-10不勾选。

本批以SDK及RTD当前源码为准：旧Kit替换成现代Kit，应用自有typed读Provider，实际SDKquery输入／select／取消、网络缓存隔离、明确签名账户／网络／signal及自定义未绑定拒绝。Kit以稳定client＋burner配置缓存，React StrictMode不重复创建，存储含完整端点标识；Slush关闭，开发burner不用于生产。getEpochs仅为RTD声明的应用扩展，并无当前RTD实现证据；SDK缺少的analytics不添加假方法／类型。历史epoch数字使用BigInt，呈现Display时保留原结构化metadata和partial errors。

| 已执行检查 | 结果与证据 |
| --- | --- |
| 当前基线／中间类型诊断 | [79条基线](./20261005-consumer-kit-baseline.log)、[31条首次](./20261005-consumer-kit-first-check.log)、[中间修正](./20261005-consumer-kit-second-check.log)、[最终7条](./20261005-consumer-kit-final-typecheck.log)；最终exit1，完整构建未通过 |
| 新合同与全部Explorer单测 | [24项定向](./20261005-consumer-kit-contract-tests-04.log)、[全部32项](./20261005-consumer-kit-explorer-all-tests.log)，均exit0 |
| 新消费范围typecheck | [显式public Kit动作类型修复后exit0](./20261005-consumer-kit-scoped-tsc-02.log)，原TS2742保留于首次日志 |
| wallet／core | [wallet完整tsc](./20261005-consumer-kit-wallet-tsc-02.log)、[1486项](./20261005-consumer-kit-wallet-tests-02.log)、[core完整tsc](./20261005-consumer-kit-core-tsc.log)、[core4项](./20261005-consumer-kit-core-tests.log)，均exit0 |
| Node准入独立测试 | [5项exit0](./20261005-consumer-kit-node-admission-tests.log)；Vitest明确排除scripts下Node cjs测试，未删除或隐藏测试 |
| 新Local产物 | [稳定源码与双入口AST](./20261005-consumer-kit-local-build-02.json)、[四入口39方法闭包](./20261005-consumer-kit-wire-audit.json)，通过 |
| 原7条journal与当前worker | [第三次只读audit通过](./20261005-consumer-kit-original-journal-audit-03.json)，7原摘要／effects一致，前后及前批逻辑SHA相同、pending0、0模拟0广播 |
| 原历史回放 | [独立TLS只读观察](./20261005-consumer-kit-history-observation.json)，0–49871／49872 markers，原22水位不变，原有进程无终态 |

首次联检发现DefaultRpcClient引入Explorer专属alias，使wallet跨项目测试／tsc／Webpack失败；改成相对导入。Node test被Vitest收集也造成首次全量失败，改为按各自runner独立验证。保留[首次构建](./20261005-consumer-kit-local-build.json)与[首次wallet测试](./20261005-consumer-kit-wallet-tests.log)，未把失败算通过。第一次原journal Chrome核验ERR_BLOCKED_BY_CLIENT、第二次只核完dApp5条后staking同错，两份失败日志保留；没有补发交易或改journal，第三次完整两账户已有7条只读核验通过。

Explorer全部32项包括24新合同和8既有单测，不能当完整产品验收。happy-dom14无法正确派发Wallet Standard AppReadyEvent的警告保留；实际modern Kit注册／本地burner连接／签名验签测试通过不等于真实扩展发现通过。尚未对Explorer完整UI、Storybook或缺失analytics服务做通过声明。钱包新产物的真实证据只覆盖当前worker及原journal只读，前批批准签名／授权矩阵不能沿用；后续fresh Fullnode sign-only／授权需按新产物重新核验。

完整机器范围、当前source／bundle／网络合同及剩余七条诊断见[证据](../evidence/20261005-consumer-kit-progress.json)。双方04／03章同步相同合同。下一步优先回到剩余钱包接口及当前产物核心链路；历史回放继续观察，达到有界终态前不恢复原live管线。

## 新bytes的Fullnode批准与授权复测计划

在现代消费联检之后，复用已评审的C1–C4合同，对当前bd5293／58e0e1执行fresh原journal准入、重建现代demo、Fullnode-only只签名及批准前授权矩阵。仅限已存在公共测试账户，禁止新增execute或资产准入绕过；明确记录实际正式模拟BCS／return／checks／Intent签名、0广播及当前worker SHA。新的结果与前批分开保存，不改变父TX-01／TX-10或trial_ready，完整资产／提交后切换／签名等待锁定仍待。

首次fresh demo构建漏传VITE_RTD_NETWORK／VITE_RTD_GRPC_URL，页面按设计展示Demo configuration required；harness停在dApp wallet discovery，0模拟0广播。保留[首次失败](./20261005-consumer-kit-fullnode-sign-only-01.log)和[未配置demo构建](./20261005-consumer-kit-demo-build.log)，不是扩展Kit产品故障证据。第二次曾使用unknown的假设，后续对审核profile读取断言发现实际sdkNetwork=localnet；该demo未通过绑定核对，不作为有效实测，失败构建／日志保留。第三次必须从审核profile读取network／Fullnode值后再构建并先生成绑定证据，不能用旧记忆推断。

[第三次明确profile绑定的demo](./20261005-consumer-kit-demo-build-03.json)构建成功；[fresh原journal audit-04](./20261005-consumer-kit-original-journal-audit-04.json)与audit-03逻辑SHA保持。当前58e0e1 worker的[真实Fullnode-only只签名](./20261005-consumer-kit-fullnode-sign-only-03.log)exit0：3次实际模拟checks均启用、两次正式模拟的BCS SHA与返回一致，预览digest及SDK Intent验签通过，0广播。实际GasData和Validity已保留在新日志，不用前批值代替。[当前产物批准前8组授权矩阵](./20261005-consumer-kit-authorization-matrix-01.log)已exit0，实际8模拟0广播；实际签名函数等待锁定及提交后切换仍不在这些组内。

新58e0e1产物的实际Fullnode-only只签名已另行通过：3次真实模拟均checks启用，两次正式模拟的BCS SHA与返回0e7190ca53ef3548e012a0ce2773242069cb373f0b622b460a413e4115aedc81一致，预览digest 5KmGLNcuJax2pq1hcijwcr9YSADvGuUxP5F7GGWXytSx及SDK TransactionData Intent验签通过，0广播；完整GasData和epoch3–4 Validity保持。8组批准前／真实模拟等待授权矩阵也在当前worker下通过，实际8模拟0广播。内币／NFT／stake完整批准、提交后切换、实际签名函数等待锁定、完整资产与正常CA仍待，父TX-01／TX-10不勾选。fresh Demo从审核profile读取localnet及Fullnode39400，不猜测网络；首次未配置及第二次unknown假设在发现阶段失败，日志与构建保留，两次均0模拟0广播。

[本地源码声明／reexport／具体实现区分](../evidence/20261005-consumer-kit-authority.json)已补录：ExtendedApiServer仅lib.rs声明重导出，不是具体服务实现；analytics相关Rust方法无引用。官方useDAppKit及本地实际action合同已核对。

06:05:05最后只读核验连续0–55171／55172 markers，原22水位不变、PID66145仍运行，无有界终态；未恢复live。详见[最后观察](./20261005-consumer-kit-history-observation-final.json)。
