# 当前有限追平观察与冷启动快照合同核对

关联 ENV／TRY-05／TX-08／QA-A14／QA-A20 与 framework K3。98 父项仍为 81/98，17 项开放，trial_ready=false。

[独立实际有限审计03](./20261007-interval-live-independent-audit-03.json)复核 28 个正式容器／14 healthy、22 个原查询进程／两 core／两 publisher 的准确身份，以及原 3 个 config SHA 与 6 个归档 metadata SHA。14 持久 HBase／23 实 SQL／4 Rocks／Display 为重新读取，未用控制器样本冒充新观察。该报告 passed 仅表示观察与保护成立，inProgress=true、catchupAccepted=false、ownershipSuccessorAccepted=false；writer／indexer 尚无自然 exit0，C4–C7 保持未完成。没有新增确认退役的临时容器；累计已审核清理 30 个，数据卷、镜像、原始失败证据和未知历史容器保留。

同一实际观察分别保存十字段声明区间与 native AvailableRange；当时 native 下界超过 HBase／GraphQL 上界，effectiveAssetWindow.windowNonempty=false。基础容器健康不表示共同资产快照可用，也不运行新 NFT 签名或 Execute。冷恢复期间的缺口据实保留。

## 权威语义与文档对齐

本轮实际查询 [Sui GraphQL 官方 scope／retention](https://docs.sui.io/develop/accessing-data/graphql/query-with-graphql)、[固定提交 consistent db/mod.rs](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-indexer-alt-consistent-store/src/db/mod.rs) 和本地 `rtd/crates/rtd-indexer-alt-consistent-store/src/db/mod.rs`／`store/synchronizer.rs`。写入与 watermark 保留，snapshot 不跨 session；恢复后从实际持久水位继续建立新 snapshot，旧高度不保证仍可请求。

对目标 T，当前状态证明用完整共同 S ≥ T 及实际同快照内容；历史 T 查询才要求 T 自身落在可用范围。同文补充加入 archive 原目录 05 与合并目录 06，未删除原目录、未改 RTD 源码／配置／原服务，未削减十字段或名称当前 native+20 门槛。已有 C40 执行工具及两份旧前置证明保留，本轮没有据此改变它的执行准入。

## 新只读工具及真实拒绝

指定 LD 新增 `audit_wallet_interval_catchup.py`，有限阶段与完成恢复阶段分开。完成阶段必须检查实际两自然退出0、200000 全管线／Display、4 个有限进程已消失及明确后继 authority、原三个命令逐字一致，不能仅以服务恢复成功准入。

指定 LD 新增 `probe_wallet_current_framework_snapshot.ts`：完成恢复证明及其全部 SHA 前置，重新核验当前 holder；使用生产 WalletAssetReader 全十依赖与共同 S，真实 native AvailableRange 前后核对，完整 cap／Kiosk／动态 NFT／不可锁定／listing 状态，并与当前 Fullnode、归档精确版本逐项核对 NFT id／version／digest／owner／type／body／previousTransaction 和 S digest。只读，禁止模拟、签名、Execute；不打开 Chrome 或 keystore。

[真实有限证明拒绝01](./20261007-framework-snapshot-finite-refusal-01.json)与[独立拒绝审核01](./20261007-framework-snapshot-finite-refusal-audit-01.json)：tsx 实际运行在完成恢复 authority 前置拒绝，0 网络／Chrome／key／模拟／签名／Execute。首次工具转换因模板括号错误失败且无网络，修复后执行上述真实拒绝；不把首次失败或拒绝测试写作正面 Kiosk 验证。首次文档写入命令因 stdin 未声明 UTF-8 未执行，增加明确 UTF-8 后完成；通过文件不掩盖这次失败。正面工具尚未运行，需等待控制器结束且实际恢复后验通过。

下一步继续观察唯一在运行的有限控制器；终态后完成 C4–C7 独立审核，再执行只读生产 Kiosk 快照与真实 UI。有限追平若失败，保留失败并验恢复，不补造目标成功。


文档验证工具的旧版本仅允许01–13，首次运行错误拒绝已经存在并有TRY-07明确接纳记录的第14章，且旧默认写入覆盖了`evidence/20261003-document-verification.json`。当前失败正文另存[legacy失败01](./20261007-interval-docs-legacy-failed-01.json)，未伪造或还原未知旧正文。修复工具要求显式新`--output`并独占写入，检查01–14准确编号、14章明确的TRY-07身份／接纳以及当前完整链接，保留原14份源文件SHA／22 QA／21线协议追溯；当前文件哈希与历史guide哈希区别单列，不将已合法更新的指南说成历史字节保持。首次过强地要求指南和历史SHA相同的[失败01](./20261007-interval-docs-verification-01.json)保留；[实际完整文档验证02](./20261007-interval-docs-verification-02.json)通过，明确不含当前安装／运行验收。


## 生产非空 framework 正面读取与 C40 执行准入更新

[有限只读观察02](./20261007-framework-snapshot-finite-observation-02.json)实际生产 WalletAssetReader 在 S184826 完成十项依赖与同快照 Display、cap／非 Personal Kiosk／一个非锁定 NFT／动态字段读取，23 次真实请求；native AvailableRange 前183765–194954／后183765–195028均包含 S。当前 Fullnode与归档精确版本269843的 NFT digest／owner／type／body／原 placement 交易一致。finiteReadonlyObservation=true、catchupAccepted=false、ownershipSuccessorAccepted=false，明确不授予转出或完整恢复准入。首轮观察01因将依赖集合错误按顺序比较失败，原证据保留；修复为长度及完整含 filters 集合比较，未削减字段。

C40 私有测试工具已改用当前 S≥180806、实际 native 区间及完成恢复生产证明；新增纯 policy，真实 finite 正面02仍拒绝执行。[22项准入测试](./20261007-framework-snapshot-admission-policy-01.json)包含过期／错链／缺字段／错 NFT 版本或 owner／有限证明拒绝；合成完成标志仅用于 policy 算术与字段测试，非恢复事实。原 C40 工具字节归档保留，当前及历史两份 preflight 未重新运行，正式完成恢复证明尚不存在，没有 Chrome／keys／模拟／签名／Execute。最终执行证据额外记录 policy 与 production witness SHA。产品源码1119及既有 C40 包保持，未改 RTD／配置／原 source。

## SQL 复用与完整 HTTP 比较：真实结果及适用范围

指定 LD 新私有 SQL acquisition 候选仅调用已资格验证的 canonical postgres_transport；每次仍用原完整 REPEATABLE READ READ ONLY 查询、无业务查询重试、无授权或对象事实缓存。SQL 01因测试脚本错误捕获 ValueError 而非实际 IncompleteHistory 在0真实读时失败，保持失败。实际[SQL候选02](./20261007-interval-sql-pool-candidate-02.json)96次六点交错真实 SQL、10项边界／错 genesis 与连接丢弃恢复通过，观测1.957倍；这不是 HTTP 或持续 native 吞吐。

完整 HTTP 01端口参数及02目录名错误导致私有启动拒绝，未完成请求；03候选48成功但活跃原 finite baseline48个503，比较失败，未将未仪表化原因写成既定结论。原失败及 helper 历史字节保留。公平的两端私有四名额 [HTTP04](./20261007-interval-sql-pool-http-qualification-04.json)96次全部200／原 SHA、7越界404通过，基线4.377／候选4.959 rps，仅1.133倍，未达到1.20门槛，未安装。

另一个私有 [并行双端latest＋SQL候选05](./20261007-interval-parallel-pool-http-qualification-05.json)同条件96次全200／原 SHA与7个404，基线4.036／候选5.083 rps，观测1.259倍。两个 role HEAD 都完成才返回或抛错，SQL仍在原 Handler 线程；原真实 gate／Handler AST及双端版本／COMPLETED／REPLICA检查保留。05仅表示本次比较通过，不是持续消费、正式安装或后继授权；当前41970有限追赶及原服务未切换。04／05原实际 native02的23 SQL／4 Rocks／27表与5生产对象证据复用且 SHA核对，明确未重跑 native。

[独立候选审核01](./20261007-interval-pool-candidates-independent-audit-01.json)重新检查输入 SHA、六点 body SHA、ABBA样本、原 AST及已有 native 原证据；抽取实际 latest AST 使用 fake 两端 stat 客户端运行9项成功／错版本／错状态／空metadata／异常及双端延迟 settlement，并验证后续请求重新调用两端。这是明确的 fake故障测试，非真实故障注入或新 native 回放。首个独立审核将关闭进程记录误当计数，真实失败另存 failure01，未修改原报告，修正数据形状后通过。

03／04／05五个已记录私有探针 PID14464、17367、17163、19409、19143均实际消失，41971–41974均无监听；本轮没有新增 Docker 测试容器，累计30个已确认退役容器清理保持，0卷／镜像／数据库删除。全部98父项仍81/98，17开放，trial_ready=false。下一步等待同一受控追赶终态，核对真实自然 exit0与恢复后继，再新建完成恢复只读 proof，执行 C40前置及一次 UI转出；任何 finite witness不可替代这些条件。


## 认证后继单点衔接 E1–E4

先在 Task.md 拆解 E1–E4，再由指定 LD 新工具实际创建独立 `certified-interval-successor-seam-20261007-01`。[真实单点衔接01](./20261007-certified-interval-successor-seam-01.json)从原200000固定可信state独立验证checkpoint200001；真实fresh SQL两次相同reference，primary和replica固定版本实际下载body，两role latest/version/复制状态前后均核对。新digest为2KkPFHHcnfQPtuEyCoTgkeVw8krbjw6F7tcHvLLo7XYJ，bodySHA f44b8f3173d5b3e716b227357557670f8b012e7cda585a436ef66d3692945448，新stateSHA 5dcb4d9652b3cef810d6e6b56d3f2ceb63cfa42217b0eb469ed67a344b6322d8。

当前源码debug verifier实际返回0且日志仅一条新quorum／连续性／digest／SHA验证；错stateSHA真实拒绝且无完整或partial输出。原0–200000全证据、原state／debug／genesis／配置SHA固定，前后各重新执行有限环境审计，22原查询／两core／两publisher及28容器14healthy保护保持。[独立衔接审核01](./20261007-certified-interval-successor-seam-independent-audit-01.json)核对实际native日志、新state与两份body、原reference／全部inputs及当前source八debug；明确没有重跑native，活跃41970 binding仍through200000、成员50207。

E1–E4仅这个单点的实际隔离准备完成；不表示完整后继区间／资格／上线，不能提供活跃200001请求权限、namespace后继、名称当前覆盖或钱包父项验收。没有新daemon／Docker容器，所有原输入与数据保留。当前C40产品源码再实查1119文件／SHA77df9a7637df9dbe4f08ef22caaf52744bd87c3f8626b9910dea47bb7dc12c39保持；三个仓库diff--check和新增Python工具编译、C40 harness语法检查通过，未以此替代任何实际UI验收。

最新控制器实际SQL与Rocks全部200000，indexer自然exit0；writer仍活跃、HBase190017，目标追赶及C4–C7未完成。81/98／17开放／trial_ready=false保持，下一轮沿用同一控制器，不启动重复有限任务。

[实际有限审核06](./20261007-interval-live-independent-audit-06.json)重新确认23 SQL／4 Rocks200000与indexer自然exit0，14HBase最低190475、writer仍活跃，C4–C7未完成。新[Docker盘点01](./20261007-interval-live-docker-inventory-01.json)112只总容器中28只本任务正式实例镜像／starttime／运行身份保持、14healthy；本任务外旧bootstrap与legacy数据容器和其他项目保留，无新增确认退役项，累计清理30不变。

## 已完成的有限追赶与真实 framework 转出（当前优先）

[完成恢复独立审核](./20261007-interval-live-independent-audit-restored-01.json)确认有限 writer／indexer 自然 exit0，14 HBase／23 SQL／4 Rocks／Display 全部达到200000，原三个命令按原字节恢复；当前 writer39302、indexer39311、consistent39319。明确后继 ownership 已接受，四个有限／回放进程已退出，28正式容器／14healthy与其他22查询、两core、两publisher及配置／metadata保持。C1–C7全部完成；下方有限阶段待恢复的叙述是历史记录。

[恢复后生产快照](./20261007-framework-snapshot-restored-01.json)在S200000实际完成23次只读请求，十依赖及Display同S、framework NFT版本／body／owner与Fullnode及archive一致。[C40真实界面](./20261007-C40-framework-single-execution-01.json)16项检查通过，仅发送一次，摘要 `JAxXTwkzygqm3PGUJeEoVcWvXQuT97TdK8nxxyzMao8A` 于checkpoint281963成功；[独立原生审核](./20261007-C40-framework-single-native-audit-01.json)确认原签名／BCS／effects、目标AddressOwner、原Kiosk为空／cap归发送人、wrapper已不存在。实际confirmed-success、pending0及正常重锁保持。审核脚本首次语法错误证据保留，修正后仅只读审核，未重发交易。

名称当前高度仍未覆盖：[实际拒绝](./20261007-interval-current-name-diagnostic-01.json)native277923高于四名称字段192496。发布器实际提交248431、pending266299，已复制11372条到259803但未提交的尾部不授予读取权限，见[只读发布阶段](./20261007-interval-publication-stage-observation-01.json)。原三consumer恢复后的bitmap冷启动重放仍在推进，不重启、不改水位。framework全分支竞争及索引281963写后刷新尚待；**81/98、17开放、trial_ready=false**保持。累计30个确认退役容器已清理，0卷／镜像／数据删除，本轮没有新增确认退役容器。


## 当前完成数：82/98，剩16项

[QA-A14当前C40完整写后读](./20261007-QA-A14-current-completion.md)与[独立父审核](./20261007-QA-A14-current-completion-audit-01.json)通过：三原NFT摘要真实滞后→S202261／202285完整十字段覆盖及实际刷新，第四framework281963仍如实同步、链成功和原journal保持。14真实UI、四新鲜原生回执／snapshot digest、7关键实现实际C39/C40/current逐字节一致；密文及完整三store保持、正常重锁、0新交易。仅勾QA-A14，TX08全入口／收款UI和其他父合同继续，trial_ready=false。

[最新恢复后验02](./20261007-interval-live-independent-audit-restored-02.json)28／14、原命令和保护进程保持，HBase／SQL／Rocks最低201476／205179／205181；[实际发布观察02](./20261007-interval-publication-stage-observation-02.json)已自然提交266299、pending为空。[全量Docker盘点](./20261007-restored-global-docker-inventory-01.json)112个中97运行／15停止，无新增明确临时probe容器；未确认退役的旧容器保持，累计确认清理30，0卷／镜像／数据删除。以下81/98与有限待恢复叙述均为保留历史阶段。


# QA-A14 当前 C40 写后读完成

本项完整原合同通过，98父计数从81变为**82/98（83.7%）**，剩16、trial_ready=false。其他TX08全部入口、目标收款UI／Personal内容刷新、framework281963追平、完整pending竞争、名称当前高度、普通HTTPS及最终发布均保留对应未完合同。

[真实C40收据03](./20261007-C40-receipt-index-catchup-chrome-03.json)14实际检查通过，使用真正原发送人保留受控profile正常解锁／重锁。OB new176999与Personal177615实际完整S202261，direct Display198775实际完整S202285；实际QueryObserver.data=true、完整十依赖／Display同S、真实刷新、成功文本和无同步提示。新framework281963在S202285实际data=false且同步提示可见，原confirmed-success／pending0不变。原密文投影及三个完整store保持，零新模拟／签名／Execute，不打开原C39持久pending或用户profile。

[独立native01](./20261007-C40-receipt-index-catchup-native-audit-01.json)四原摘要新鲜原生回执／原effects和真实snapshot checkpoint digest通过；QueryObserver key、同H0原始完整十字段响应／真实范围、Display及资产刷新逐条对齐。[父审核01](./20261007-QA-A14-current-completion-audit-01.json)将三笔原交易最初实际滞后提示与当前同原摘要覆盖证明关联；OB最初公开收据确实用无资金随机账户，当前用真正发送人，未隐去边界。7个收据／Provider／完整快照关键实现从实际固定C39和C40 production source map及当前源码逐字节相同，旧证据没有冒充当前构建。

保留失败：Chrome01在第一条actual indexing true后，工具过早检查未完成的refresh；Chrome02完成四收据／原journal密文重锁，但一条JSON响应捕获SyntaxError未分类，整体仍failed。v2首个准备命令cwd路径错误发生在写文件／Chrome之前。v3增加实际HTTP状态／body哈希诊断并等待真实refresh，03整轮0捕获错误通过；不能反推02未知响应原因。未重签或重发原交易，首轮退出没有显式正常重锁，v2通过正常UI重新锁定并建立新基线。

运行后验：恢复审核02显示28正式容器／14healthy、原25查询命令与两core／两publisher保持，HBase201476／SQL205179／Rocks205181继续推进；发布器观察02实际提交266299、pending为空。全量Docker盘点112（97running／15exited），无新增明确临时探针容器；累计30已确认退役容器清理，0卷／镜像／数据删除。

## 受控收款人 UI 继续验收（父项仍82/98）

receiver-display-chrome-01实际原recipient账户、incoming活动／原收据成功、NFT图片32×32／Display／详情、完整S203735及正常重锁13项已观察；整轮因通用响应监听重复读取专用account route已保存的响应而failed，三条HTTP200捕获Error保留，不能当整体验收通过。v2首次resume误复用原raw filename，wx按原设计拒绝覆盖、异步route抛EEXIST使Node退出；[route-failure-02](./20261007-C40-receiver-display-route-failure-02.json)保留，无旧原始响应覆盖／无新交易／无受控孤儿Chrome主进程。v3新每轮raw目录／同步唯一序号，原受控profile正常锁定基线与解锁，并补齐密文及完整三store前后核验；当前进行中，不代称V1–V4完成。

三repo diff--check、Python审核语法及新CJS语法通过。QA-A14完整父审核已完成，其余16父项仍开放；不重复全量产品测试，因为本轮未改产品源码／SDK／RTD二进制。

## 受控收款人当前 C40 完整后验

[receiver Chrome03](./20261007-C40-receiver-display-chrome-03.json)15项实际检查与[native02](./20261007-C40-receiver-display-native-audit-02.json)通过，真正原recipient `0x32707d815917729a49dc103a1b511f297de389b19600611fcc1a5cdb8b91dcb7`，完整S204560≥原198775。原direct摘要incoming活动／成功收据、NFT图片实际32×32／Display名称／详情／转移链接成立；不点击准备。独立新鲜归属／NFT及模板规范BCS、原PNG SHA、actual ten-field snapshot digest／实际历史覆盖checkpoint digest／三原raw页、真实worker/UI及最新源码八debug核验，原密文及三store保持／正常重锁。0新签名模拟Execute，无原用户profile／CA更改。

D5及V1–V4子项完成，账户history全活动／全转移覆盖旗标仍false，framework281963未indexed、Personal空内容刷新与TX08全入口／QA-A13完整范围继续开放，**82/98、16开放、trial_ready=false**保持。

失败保留：receiver01专用raw route和通用response监听重复捕获Error，整体failed；receiver02 wx拒绝旧raw同名，Node route callback退出，旧证据没有覆盖且无受控孤儿Chrome主进程；03每轮新raw目录／同步序号和正常受控原profile锁定基线补证成功。native01误读原Display seed的不存在.value（实际.template）且默认FullnodeReader在fetch observer设置前构造，原真实对象读取不列入paths；新v2显式动态fetch观察并验证两个GetObject，规范.template比较通过。v2第一次命令文档目录名拼写错误，在读取proof之前ENOENT，0网络；随后正确路径只读02通过，期间没有重复转移。

最新[恢复后验03](./20261007-interval-live-independent-audit-restored-03.json)通过，14HBase／23SQL／4Rocks最低205843／209516／209519；28正式容器／14healthy、原25命令与两core／两publisher、三config／六metadata SHA及明确后继ownership保持。C40两轮实际验收与只读原生审核结束后未改正式服务／数据。本轮属于真实推进：有限追赶终态及恢复、framework唯一转出、QA-A14完整父收口、受控收款D5均有真实证据；下一轮优先补当前拥有对象完整验收／Personal空内容刷新及TX04竞争，名称新鲜度／framework281963后继索引和普通ChromeHTTPS等保持未验，82/98、16开放、trial_ready=false。

