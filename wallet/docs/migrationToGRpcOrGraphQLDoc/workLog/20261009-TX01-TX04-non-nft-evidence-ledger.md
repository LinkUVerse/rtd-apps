# TX-01／TX-04 非NFT事实、来源继承及补验清单

2026-10-09，TXT-2完成的是证据清单整理。NN-04／NN-05完整业务验收和原TX-01／TX-04仍开放。下列事实保持各自发生时的产品版本、账户、入口和审核范围；不重跑原creator，不重签或重发已批准摘要，不用工具夹具代替钱包业务。

本轮重新读取16份已接受独立报告，核对它们直接引用的107份钱包workLog JSON原SHA全部保持，无冲突或缺失；当前C136完整1122文件、生产产物及来源守卫再次通过。机器清单见[核查记录](./20261009-TX01-TX04-non-nft-evidence-ledger-01.json)。核查只读，不产生签名、模拟、Verify或Execute请求。

## 已接受事实与不能扩大的范围

| 条件／入口 | 实际独立证据 | 可以接受的事实 | 尚不能据此接受的条件 |
| --- | --- | --- | --- |
| 普通／导入账户、默认／完整GasData／外部费用方 | [C46授权独立02](./20261007-C46-current-authorization-matrix-independent-02.json)，C46／1120源 | mnemonic-derived和imported各三种交易模式，六交易签名；另四个人消息签名。完整bytes、sender、gas、expiration、真实模拟与验签、外部owner单签Execute拒绝及三journal保持 | 当前C136普通／导入全部入口矩阵；C46单签拒绝不等于链上赞助执行成功 |
| coin／stake／withdraw内部gas变化再次授权 | [C46内部独立02](./20261007-C46-internal-gas-authorization-audit-02.json)、[C117独立04](./20261008-C117-non-nft-validity-independent-04.json)、[C125独立01](./20261009-C125-non-nft-signing-independent-01.json)、[C126独立03](./20261009-C126-non-nft-signing-independent-03.json) | 各轮三个内部入口、十五实际ENABLED模拟／九规范最终effects、六gas选择；明确克隆BCS的budget+1000且旧digest不变，实际旧批准拒绝及Back／Review新批准身份 | 克隆输入故障不是用户修改gas或链上市场价格变化；不同轮次不是独立账户全组合；C136完整再授权终验仍待 |
| 三业务Wallet Standard有效期预览 | C117独立04，C109／1122源 | 三业务各九种有效期共27正常dApp UI案例，12规范正面、12时间戳错误3、三个Epoch0错误13；连同内部共42模拟，108变异拒绝 | 本轮没有签名／Execute；C124只读准入实现后来改变，不能把C109有效期全矩阵称为C136实际重验 |
| 自付gas的三业务只签名 | C125独立01，C124／1122源 | 既存imported账户，三业务各四种可签有效期，共12正常Approve、12真实签名及12原生Verify；24同字节规范最终effects，加内部共39模拟、84变异拒绝 | 没有Execute；不覆盖当前C136普通账户全矩阵和所有内部最终发送条件 |
| 外部费用方的三业务只签名 | C126独立03及原赞助专项报告，C124源 | 既存imported账户，三业务各四种可签有效期，12真实发送方签名／12原生Verify、39模拟；通用及赞助专项各84变异拒绝。实际UI发生在四次HBase运行变化之前 | 外部费用方只签名不是双签广播。C126独立01／02原失败保留，不能选它们当通过；旧运行资格不能当当前fresh七门 |
| 普通coin赞助双签执行 | [C128执行独立03](./20261009-C128-executed-independent-03.json)，C124源 | 原C126批准的同bytes发送方签名，加一次赞助签名、一次Execute；checkpoint1014706实际成功。完整BCS／双方验签／effects／普通Coin对象与余额gas等式、八变更payload旧双签拒绝成立 | 本轮新Wallet Standard批准次数为0；不能冒充当前构建新授权、其他有效期全部执行或写后归档。原交易只读恢复，不重发 |
| 普通coin外部owner单签执行拒绝 | [C129独立05](./20261009-C129-single-sign-sponsored-coin-independent-05.json)，C124源 | 正常未改钱包UI／worker／popup、Approve禁用、正常Reject／Disconnect／relock；89只读UI响应，0模拟／签名／Execute，journal／密文保持 | 不能自动扩大到stake／withdraw所有正常UI入口；先按父合同确认共享守卫的来源和已有证据，再决定确切补测范围 |
| 新stake赞助授权与执行 | [交付独立01](./20261009-C129-delivered-stake-sender-independent-01.json)、[执行独立01](./20261009-C129-sponsored-stake-execution-independent-01.json)，C124源 | 一次新正常发送方签名、两同字节模拟／一次原生Verify，加一次赞助签名、一次Execute；checkpoint1028207，本金、active pool、activation epoch、owner及双方余额gas独立成立；原C43仓位未消耗 | 启动一条GetServiceInfo正文未知，原因未确认；两份报告明确fullUiCaptureAccepted=false。成功执行不能补造该正文或完成完整M5 |
| 本批新stake的赞助赎回 | [UI独立02](./20261009-C129-fresh-sponsored-withdraw-ui-independent-02.json)、[执行独立01](./20261009-C129-sponsored-withdraw-execution-independent-01.json)，C124源 | 当前新正常UI／worker／popup、354完整UI响应、两同字节模拟、一次Verify及发送方签名；再一次赞助签名／一次Execute，checkpoint1034440，仅消费本批新stake返还1 RTD。删除、本金、pool、余额gas及原C43保持独立成立 | 不覆盖所有有效期执行、所有账户或C136整个授权矩阵；早期普通UI失败保留，旁观诊断签名未用于广播 |
| 当前四入口live竞争及释放后预览 | [C137独立02](./20261009-C137-current-non-nft-live-independent-02.json)，C136源 | coin／stake／withdraw／dApp四路实际拒绝，八关键模拟正文完整、一次原生Verify、三个释放后预览；原私有signData完成一次但返回签名0、Execute0，完整journal保持及正常relock | 四只读正文未知，fullNonNftM5Accepted=false；此为live竞争，不能替代durable pending，也不能把原私有调用写成0 |
| 当前四入口cold持久拒绝及正常控制流程 | [C138控制前缀独立02](./20261009-C138-current-cold-controls-prefix-independent-02.json)，C136源 | 三资金表单及真实dApp的durable拒绝、空闲native lock上trusted prepare明确拒绝、三store／cipher保持、正常Unlock／Reject／Disconnect／relock；215正文、14原固定摘要恢复查找、0新模拟／Verify／Execute请求和签名交付 | 实际actor仍false：一条1417字节正向WalletSnapshotAdmission正文未知，初始UI／worker实际字节不全，直接私有signData调用次数未观测，采集不含完整teardown；完整M5未通过 |

## 当前来源如何继承

1. C109→C124由[独立02](./20261009-C124-production-source-independent-02.json)限定为transaction-move-admission.ts及其测试两文件。完整原生产逆变换成立，最大只读probe两次、原native window／ticket／总期限保持，无签名或发送重试；这是实现来源资格，不是旧有效期UI在新版本实际运行。
2. C124→C131由[独立01](./20261009-C131-production-source-independent-01.json)限定为Transactions.ts、UiConnection.ts及Transactions.test.ts三文件。只对approved=false的孤立元数据作清理，active approval subject timing／durable journal保持；207定向回归及完整生产类型、构建通过。两个后台业务文件确实改变，因此旧版本正常Approve／Disconnect／窗口恢复的完整实际矩阵不能无条件继承。
3. C131→C136由[独立01](./20261009-C136-production-source-independent-01.json)限定为Window.ts的默认popup大小／位置／focus。1121其余产品文件及全部签名／执行／恢复文件保持，207回归、类型、构建通过。它支持签名／执行模块来源未变的结论，不能单独证明实际窗口和整个业务验收。
4. C137及C138已经实际使用C136，其明确通过的live／cold控制前缀可按各自范围接受。C143当前空worker直接入口、只读完整entity正文、真实浏览器取消和requestfinished观察工具通过，只说明工具可用；不能给旧cold的未知正文补值，也不能把空profile零调用移作原pending零调用。

历史TransactionData／签名／原生effects与一次执行的事实保留，不因新窗口布局重复签名或广播。重新授权／连接生命周期的当前完整验收必须使用当前实际来源；只补影响当前合同且确实未验的案例，不将全部历史测试机械重跑。

## 可执行补验队列

| 顺序 | 对应条件 | 下一步与通过门槛 |
| --- | --- | --- |
| 1 | NN-05采集与来源 | 将C143完整只读entity／真实浏览器结束事件／三个私有入口观察器与C138初始UI-worker字节持久化接入新的只读cold工具；未知值保持null或失败，所有事件和teardown留存。先静态审查来源，不执行旧失效网关 |
| 2 | 当前查询运行资格 | 当前C141冻结作业和指定完整独立审核结束后，显式登记必要query／guard精确归属，取得同H0／generation、完整所需范围、origin／TLS和fresh七门。不得盲增容器破坏正在核验的运行集合；TX复验不要求C139全量回放或全部物理/WAL QA先通过 |
| 3 | NN-05原固定摘要cold | 使用原自然pending，仅只读恢复原digest；四入口持久拒绝、空闲native lock／trusted拒绝、全部正文和初始来源、真实直接私有调用0、请求计数、三store及cipher、正常Unlock／Reject／Disconnect／relock与teardown同时独立成立。creator和旧批准不重跑 |
| 4 | NN-05当前live完整M5 | 历史四未知正文保留失败；仅新的必要live案例完整留存所有原帧／来源／原私有调用与签名交付次数／请求／journal。明确区分占用时原一次签名与第二入口0新增、live与durable；限定通过不冒充完整M5 |
| 5 | NN-04账户与入口完整关联 | 把普通／imported、内部coin／stake／withdraw及Wallet Standard的bytes／sender／完整GasData／费用方／expiry／旧批准拒绝及新授权映射到实际证据。C125／126仅imported，新构建普通账户或入口缺失需补；公共守卫若可合法继承须写明模块／路径／原测试，不凭代表Coin扩大范围 |
| 6 | NN-04实际授权缺口 | fresh准入后补确切缺失的当前正常授权／有效期／费用方／重新授权案例；需要新交易时先取最新Coin version、epoch及active pool，正常新批准，完整同字节模拟和验签。既有三赞助执行事实只读继承，不为汇总再次消费原C43、重放原批准或复用已变化对象 |
| 7 | 原父任务完成 | 全部第一阶段非NFT功能验收后，再做TX-01内部NFT重新授权／赞助／有效期及TX-04 NFT M3／全入口M5。只有原两父完整条件全部成立，才将10/12改为12/12 |

普通Chrome Mac锁屏直接影响ENV-07／QA-A19，以上独立受控开发测试不直接等待解锁。名称757805、新交易归档覆盖及完整物理/WAL各保持自己的原父合同，不能不加区分地列为TX前置。

当前仍89/98、细分剩余9.18%、trial_ready=false。TXT-2只完成事实清单，不改变原父项、原98分母或原细分权重。
