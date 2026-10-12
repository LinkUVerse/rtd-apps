# 签名交付等待与提交后生命周期：实施工作日志

2026-10-05。按[先存设计](./20261005-sign-dispatch-lifecycle-design.md)和Task的AUTH1–AUTH6推进。父TX-10／TX-07继续开放，49/98，trial_ready=false；子任务不另计98项。

## 当前范围

AUTH2真实软件签名完成、结果仍在原调用交付等待期间的8组完整通过。AUTH3四类提交后脚本已编码，仅锁定实际一笔完成响应／pending证据，初始整轮随后清理失败，独立原摘要复核通过；切网／换账户／caller取消三个独立场景已另整轮通过，合计9模拟3Execute。AUTH4当前8组批准前复测03完整通过，6模拟0Execute，01／02失败保留。本批没有产品源码变更，没有宣称完整生命周期／所有接口／试用通过。

## AUTH1：官方合同与实际调用

[Sui标准固定源码](https://raw.githubusercontent.com/MystenLabs/ts-sdks/99b8234366f822f53a7ae6e920ec9891fe9a463c/packages/wallet-standard/src/features/suiSignTransaction.ts)声明标准输入显式account／chain、可选signal，输出原始bytes／signature。[当前modern Kit源码](https://raw.githubusercontent.com/MystenLabs/ts-sdks/99b8234366f822f53a7ae6e920ec9891fe9a463c/packages/dapp-kit/packages/dapp-kit-core/src/core/actions/sign-transaction.ts)在应用未覆盖account／network时解析当前选择，再向现代标准显式传入account／chain并转发standardArgs。应用层可选参数与钱包标准显式输入是不同边界；RTD现有显式批准规则保持。

[官方签名说明](https://sdk.mystenlabs.com/dapp-kit/actions/sign-transaction)确认signal用于取消签名请求；[Wallet Builders迁移](https://sdk.mystenlabs.com/sui/migrations/sui-2.0/wallet-builders)确认core结果union及BCS effects。上述资料不能证明密码学运算物理停止、链上已提交交易撤销或RTD持久恢复合同。这些边界由本地授权守卫和原摘要journal验证，不把示例等同完整授权实现。固定源码及来源SHA见[manifest](../evidence/official/20261005-sign-dispatch-lifecycle/manifest.json)。

通过当前worker的主脚本逐字比较、选定模块边界和实际signData调用行设置CDP断点。签名模式dapp-signing第185304零基行，执行模式dapp-execution第184918零基行；均排除PersonalMessage与内部钱包入口。[CDP官方API](https://chromedevtools.github.io/devtools-protocol/tot/Debugger/)用于getScriptSource／setBreakpoint／evaluateOnCallFrame／removeBreakpoint／resume；实际callFrame和account对象不输出。

## AUTH2：实际签名交付的完整8组

[最终08原始日志](./20261005-sign-dispatch-lifecycle-sign-hold-08.log)及[提取的机器报告](./20261005-sign-dispatch-lifecycle-sign-hold-08.json)终态exit0。真实UI导入公开测试账户、现代Kit连接，分别执行sign／execute×lock／network／account／cancel。批准后调用实际账户原signData，真实签名完成但只留在闭包内；在交付被暂扣时实施实际账户锁定／网络切换／账户切换／AbortSignal。每组结果未返回签名、没有Execute、批准记录清除、原空journal不变，原账户signData／fetch恢复并验证；矩阵全局提交拦截在设置断点之前安装，最终恢复通过。

不是物理硬件等待，也不是密码学方法尚未完成。测试未导出或持久化签名／密钥／密码／paused scope，仅保存完成状态、原bytes SHA、digest和源码证明。sign-only锁定后错误自行结束原请求；execute遇错保守保留原批准请求后，由caller取消这个原请求，不新发请求。

总计27次实际Fullnode模拟：正常只签名3次，加8组各3次。全部checks=ENABLED且目标为审核Fullnode；18次正式模拟均doGasSelection=false、对应每组实际签名Intent去掉3字节域头后的bytes SHA，每组精确2次，另2次匹配正常返回bytes。9次结构化解析保留gas选择。0实际Execute。正常只签名批准摘要与返回BCS摘要一致，SDK Intent验签通过；全部8组当前后台源码逐字核验、启动／完整浏览器重启核验、错误密码／正确密码、重启锁定与解锁通过。Chrome153.0.8010.12；两份精确leaf SPKI例外，不宣称正常CA。

正常返回digest：XDE6tp1jD1JzhRs2Ggj5BGu85tsuyHLJFcqBQGhCvi9；bytes SHA：5c4bec53ddedde181a1dd3209df5182ffd0260c83f478f4d0b179b08ef4bc222。

失败保持：01在模块路径假设处失败，3模拟0Execute；02仅记录初始化Error、3模拟0Execute，未捕获具体原因，不以单独setup成功补为通过；03固定点击取消按钮超时，真实sign:lock状态已完成、6模拟0Execute；04关闭谓词5秒超时，6模拟0Execute；05仅单组sign:lock通过，6模拟0Execute；06关闭谓词中点击按钮与sign-only自然结束竞争，最终已关闭／approvals0／无结果但整轮失败，6模拟0Execute；07前7组通过、最后一组取8MiB当前主源码10秒超时，24模拟0Execute，不能记为完整矩阵。最终分开sign-only自然关闭与execute保守取消，getScriptSource单独30秒、字节比较不放宽，串行08完整通过。

## AUTH3：一次真实提交后锁定与只读复核

[初始整轮报告](./20261005-sign-dispatch-lifecycle-post-lock-01.log)失败且保留专属目录dapp-post-dispatch-lock-20261005-01；3模拟、1Execute。批准前attempt先持久保存，准入要求fresh原7journal、当前后台SHA、契约仓原validate_current对最新RTD debug源码／8产物／真实PostgreSQL测试核验、所有既有生命周期attempt无pending及新鲜原账户gas余额。禁止EEXIST覆盖、faucet、dev私钥夹具和未确定attempt绕行。

原摘要CCNYbcxR5JqzFf9WJnpwVa3GjKr4Qat2VVJKGAqp8hro。实际Execute request签名经SDK Intent核验；真实HTTP200／grpc-status0响应已完整接收，原始BCS／签名SHA匹配request，effects摘要／成功状态匹配。仅将该原响应交付暂扣，没有替换响应。实际账户锁定触发StaleWalletSessionError中止transport；caller取消原批准窗口后原摘要dispatch-pending仍在，journal不保存bytes／signature，未返回dApp签名。实际上游响应和原pending证据均已落盘；随后恢复账户的finally阶段抛Error，原始报告未记录更细原因，不能推断已修复。

[只读复核01](./20261005-sign-dispatch-lifecycle-post-lock-recovery-01.log)在锁态断言失败，观察到1次浏览器GetTransaction，没有记录具体账户状态；没有根据后续成功反推其原因。[只读复核02](./20261005-sign-dispatch-lifecycle-post-lock-recovery-02.json)及[原始日志](./20261005-sign-dispatch-lifecycle-post-lock-recovery-02.log)终态exit0、账户初始确实锁定、未执行显式lock分支，无解锁。原记录已是终态，SDK原摘要点查核对原bytes／签名SHA、Intent签名和effects BCS，0模拟0Execute。其lookups=0只统计浏览器；verifyNative另执行1次Node原摘要点查和1次H0读取。不能称为02首次pending转终态，亦不能将初始整轮报告改为通过。

保留目录内admission、attempt、dispatch-wire、dispatch-response、post-dispatch-pending、confirmed、restart-verified和私有recovery文件均保持。首次整轮没有在终态报告前持久化模拟帧数组，此缺口保持；新脚本已补simulation-wire与清理阶段诊断，但不补造旧帧、不重新提交原摘要。其它三类提交后场景待严格串行推进，每个新尝试必须先核对原7及所有既有新attempt。完整AUTH3／TX-07／10均未完成。

## AUTH4–AUTH6与产物、历史边界

[批准前复测01](./20261005-sign-dispatch-lifecycle-approval-matrix-01.log)在同origin sibling原请求隔离的消息等待阶段失败，2模拟0Execute，没有捕获精确原因；[第二轮](./20261005-sign-dispatch-lifecycle-approval-matrix-02.log)在import persisted阶段Error退出、0模拟0Execute，原报告未记录具体原因。[第三轮日志](./20261005-sign-dispatch-lifecycle-approval-matrix-03.log)与[完整报告](./20261005-sign-dispatch-lifecycle-approval-matrix-03.json)终态exit0，当前8组全部通过：同／异origin与tab请求所有权、锁定批准页真实解锁、切账户取消与第二账户权限拒绝、顶层／iframe直接消息边界、切网取消及chains／events、6类调用前／序列化／批准取消、真实模拟HTTP200响应交付等待期间锁定取消和caller取消。整轮6模拟0Execute，当前worker启动／重启逐字相同、PersonalMessage及撤权／重载复核通过。UI控制命令等待30秒，所有生产读取／提交期限未变；两次失败具体原因未捕获，不因提高等待后通过而反推它们必为超时。旧产物的通过未冒充本批。原非执行准入守卫[5项最终测试](./20261005-sign-dispatch-lifecycle-admission-tests-final-02.log)通过，新增post-dispatch标志同样被Fullnode-only拒绝；显式真实执行模式独立受原7终态／已有attempt和当前debug验证控制。

[本批源码／产物再次核对](./20261005-sign-dispatch-lifecycle-build-unchanged-01.json)：1016项源码SHA6f9dd283、UI502b1fa0、后台64061534与上一批稳定N构建逐项相同。本批仅docs／scripts变化，不重复声称1618全量测试、钱包／core tsc是本批新执行；上一批产品检查证据保留。[四入口闭包](./20261005-sign-dispatch-lifecycle-wire-closure-01.json)再次通过21使用／18未使用旧方法及envelope／import检查，静态限定范围保持。

[历史只读01](./20261005-sign-dispatch-lifecycle-history-01.json)通过原契约runner／两个严格coverage事务：0–110265、110266个marker、原22水位不变、原PID66145运行、boundedExitCode=null、上界386503。先前marker／watermark拒绝的D5调查仍开放，未改源码、planner或adapter，未重启／提前resume。

原两profile7条不可删除／重发；10分钟前置原7审核与各组最新报告分别保存。最终原7审核、新lock的当前完整绑定／3 stores／原生签名及effects终态审核分别单列，不修改原日志。完整网络capability／正常CA、内部业务全批准、NFT／活跃质押／赎回／非原生发送全部及试用门槛仍待。只有完整合同与实测均成立才更新父勾选。

最新[历史只读02](./20261005-sign-dispatch-lifecycle-history-02.json)通过原严格验证器：0–117922、117923个marker，原22水位保持、PID仍运行、boundedExitCode=null；与01不同观察时点分别保存，不以历史继续推进假称完整Display或试用就绪。

## AUTH5／AUTH6：本批审核与文档收口

[最终原7条审核](./20261005-sign-dispatch-lifecycle-original-journal-final-01.json)通过，两profile共7条终态、0模拟0Execute、7次原摘要点查；[前后报告比较](./20261005-sign-dispatch-lifecycle-journal-comparison-01.json)确认两个逻辑SHA与上一批N最终审核逐项相同。新lock的[独立终态审核](./20261005-sign-dispatch-lifecycle-new-journal-audit-01.json)核对当前worker、原完整绑定、3 stores、原生签名及effects，0模拟0Execute、1次原摘要点查与1次H0读取；审核前后逻辑内容相同。AUTH5仅完成截至这一个新attempt的审核，不把未执行的三类事件记为通过。

[当前9个脚本清单](./20261005-sign-dispatch-lifecycle-source-inventory-final-01.json)、[文档验证01](./20261005-sign-dispatch-lifecycle-document-verification-final-01.json)和[合并方案验证](./20261005-sign-dispatch-lifecycle-merged-docs-final-02.log)保留：27份选定文档、699个既存本地链接、2处新增双方相同合同段；13章／14原稿／22 QA／21 RPC静态核验通过。前述文档与清单仅证明其观察时点的文件状态。[apps](./20261005-sign-dispatch-lifecycle-apps-diff-check-01.log)、[archive](./20261005-sign-dispatch-lifecycle-archive-diff-check-01.log)、[contracts](./20261005-sign-dispatch-lifecycle-contracts-diff-check-01.log)的git diff --check均实际exit0。后续三类事件仍按AUTH3串行推进，每个尝试独立保留原始失败／成功证据并再次同步进度；本批收口不关闭父任务。

## AUTH3续：提交后切网整轮通过

[切网01原始日志](./20261005-sign-dispatch-lifecycle-post-network-01.log)实际exit0及[完整报告](./20261005-sign-dispatch-lifecycle-post-network-01.json)通过。准入先用[原7条13审核](./20261005-sign-dispatch-lifecycle-original-journal-13.json)、新lock只读终态复核以及契约仓最新debug原验证器，再新建唯一network目录。3模拟／1Execute，2次checks=ENABLED、doGasSelection=false正式模拟BCS SHA与实际签名bytes相同；结构解析模拟另1次。实际response 200／grpc-status0、原签名／bytes／成功effects与request吻合，原响应完整接收后交付暂扣。

原摘要4w4Q3Gdqt2P8mjse36CFWQHGsDNREzBSM6TDkxJWJhYZ。实际切DevNet触发原transport取消，原批准请求清除／无dApp结果，原Local的H0／generation／account／request／origin／revision及digest dispatch-pending保留。恢复审核Local并核验现代钱包chains事件后，原账户锁定／错误密码／正确密码与整浏览器重启检查均通过；重启账户锁定，原摘要只读恢复、实际Intent签名与effects BCS核验成功，没有重发。启动／重启当前worker与磁盘源码相同。模拟帧、实际request／response和pending／confirmed／restart证据分别落盘；没有给此前锁定场景补造模拟帧或改写其整轮失败。本场景不证明仍停留DevNet时跨网络恢复，完整AUTH3仍待换账户／caller取消及锁定缺口审计。

## AUTH3续：提交后切账户整轮通过

[切账户01原始日志](./20261005-sign-dispatch-lifecycle-post-account-01.log)实际exit0及[完整报告](./20261005-sign-dispatch-lifecycle-post-account-01.json)通过。先用[原7条14审核](./20261005-sign-dispatch-lifecycle-original-journal-14.json)、新lock／network两个既有attempt只读终态复核及契约仓当前debug原验证器准入，再新建唯一account目录。原摘要41m7jB7Mj3JfUG7hiRMRmC6ciwoyfnwjtVJQcau9vAW1，3模拟／1Execute；2次固定BCS正式模拟与真实签名bytes相同、checks启用且gas选择关闭，真实200／grpc-status0成功response与request原bytes／签名／effects一致。

账户切到独立第二账户时，原response已接收但交付暂扣；实际选中变化取消transport、清除原批准且无dApp结果，原账户的H0／generation／request／origin／revision／digest pending完整保留，不移动到第二账户scope。恢复原账户选择并移除只用于切换的第二测试账户后，整浏览器锁定重启查原摘要，原签名Intent／bytes／链effects一致、终态成功且无重复dispatch。当前worker启动／重启逐字核验、密码与锁定检查均通过，模拟帧及上游／pending／终态证据持久保存。本场景不证明保持第二账户选中时可跨账户恢复；caller取消与原锁定场景缺口仍待。

## AUTH3续：提交后调用方取消整轮通过

[caller取消01原始日志](./20261005-sign-dispatch-lifecycle-post-cancel-01.log)实际exit0及[完整报告](./20261005-sign-dispatch-lifecycle-post-cancel-01.json)通过。准入先用[原7条15审核](./20261005-sign-dispatch-lifecycle-original-journal-15.json)、新lock／network／account三个既有attempt只读终态复核和契约仓当前debug验证，再新建唯一cancel目录。原摘要FzdCEXSXD3mBuxPBst9E2GZbGhdXBZXoNyafTiJmr5SD，3模拟／1Execute；2次正式模拟checks启用、doGasSelection=false且BCS SHA与实际签名bytes相同。真实response 200／grpc-status0、原签名／bytes／成功effects核对通过，完整接收后暂扣交付。

实际现代Kit调用方Cancel transaction request触发原AbortSignal，钱包将原请求的会话中止映射为StaleWalletSessionError；原response未交付、原批准清除、无dApp结果，原完整绑定／摘要dispatch-pending保留。原账户锁定、错误密码／正确密码和整浏览器锁定重启通过；重启只查原摘要，Intent签名／BCS／原生effects及终态吻合，无重复提交。当前worker启动／重启逐字核验、模拟帧／上游／pending／终态分别持久保存。取消只停止交付，不撤销已成功的链上交易。

三个续验场景合计9模拟3Execute；连同初始锁定尝试累计12模拟4Execute。锁定初始整轮仍失败，模拟帧缺口及第一次只读锁态失败仍未解释，不将四类称为完整矩阵通过。当前末尾原7及新增四attempt审核分别保存。最新[历史只读03](./20261005-sign-dispatch-lifecycle-history-03.json)原验证器两次严格事务通过，0–122625／122626 markers、原22水位不变、原PID66145运行、boundedExitCode=null，上界386503。没有重启、修改RTD／planner／adapter或提前resume，先前D5拒绝调查继续开放。

## 续验最终审核与保留范围

[三类整轮与原lock限制汇总](./20261005-sign-dispatch-lifecycle-post-dispatch-summary-01.json)分别记录9模拟3提交及初始lock 3模拟1提交，fullFourCaseMatrixPassed=false／auth3Complete=false。当前[最终原7条审核02](./20261005-sign-dispatch-lifecycle-original-journal-final-02.json)0模拟0提交、7次原摘要点查；[新增四attempt审核02](./20261005-sign-dispatch-lifecycle-new-journal-audit-02.json)当前worker／完整绑定／3 stores与原生bytes／签名／effects全部通过、0模拟0提交、4次原摘要点查与4次H0读取，审核前后逻辑内容不变。[报告比较02](./20261005-sign-dispatch-lifecycle-journal-comparison-02.json)确认原7逻辑SHA仍与N完全相同，new lock仍与早先独立审核一致，各此前new attempt也与后续准入审核SHA相同。所有原始目录、失败报告与私有恢复文件保持，未删除／重签／重发。

[当前worker字段复核](./20261005-sign-dispatch-lifecycle-worker-proof-review-01.json)明确逐字段核对六个实际启动／重启CDP证明与四个终检CDP证明的matchesDisk、workerSha256／diskSha256及reloaded=false，均与当前后台64061534相同。[续验后稳定来源核对](./20261005-sign-dispatch-lifecycle-build-unchanged-02.json)重新计算1016源码、UI／后台SHA，与N及本批01逐项相同；没有重复构建或把上一轮1618／tsc称为本轮新执行。[文档验证02](./20261005-sign-dispatch-lifecycle-document-verification-final-02.json)在当次观察已核对9对合同段、27文档708既存链接、9脚本SHA；续验新增链接与最后文档修改另做终检。

AUTH5本批有限审核延续完成到新增四attempt，AUTH6双方合同／Task／current-state／totalProgress按三类实测同步。原lock整轮清理失败的原因、缺失模拟帧与第一次恢复锁态断言不能由这三轮成功解释；完整AUTH3、TX-07／10仍开放。下一步按剩余接口与核心链路合同推进，未经完整验收不提升试用状态。

续验后[文档终检03](./20261005-sign-dispatch-lifecycle-document-verification-final-03.json)实际通过：27份选定文档、725个既存本地链接、9对相同合同段及9脚本SHA，98父任务中49完成、TX-07／10仍开放。[合并源终检03](./20261005-sign-dispatch-lifecycle-merged-docs-final-03.log)13章／14原稿／22 QA／21 RPC仍通过。[apps diff检查02](./20261005-sign-dispatch-lifecycle-apps-diff-check-02.log)、[archive diff检查02](./20261005-sign-dispatch-lifecycle-archive-diff-check-02.log)、[contracts diff检查02](./20261005-sign-dispatch-lifecycle-contracts-diff-check-02.log)均实际exit0。上述验证时点之后仅追加本段证据引用；最终本地链接检查另存同前缀final-04.json。总进度仍由Task计算49/98、trial_ready=false。
