# 开发验收包安装与回归说明

当前说明更新于 2026-10-12 C362/C360。总体 **96/98**；核心可试用门槛已通过，完整交付仍待 QA-A17 和 REL-05。逐包实时状态见[剩余工作量](./leftProgress.md)，大项见[总进度](./totalProgress.md)。以下配置优先于本文保留的历史记录。

## 当前普通 C51 Chrome：C362 已安装

- 原路径：`/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261006-03/certified-positive-production-C46-20261007-01`。路径名称保留，实际内容是 C362。
- 审核构建：`/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261006-03/certified-positive-production-C362-20261012-01`，manifest `26.10.12.0`，扩展 ID `kiahlcbejlgmnbmcggnhagbccojnbkaa`。
- 保留独立 C51 profile 和四个测试账户。升级不卸载扩展、不删除账户库或 journal；旧 C292 完整产物保存在原路径的 `-C292-retained-by-C362-20261012-01` 后缀目录。既有账户解锁及升级已有主人持续授权；密码不写入文件。
- [当前构建、安装、269项回归与普通Chrome实证](./workLog/20261012-C362-validator-selection-refresh.md)：首页100 RTD、选择验证者跨后台刷新保留、可进入质押数量页；21项RPC/54个路由的版本与例外追溯由[C362完整审核](./workLog/20261012-C362-upgrade-completion-01.json)承接。

## 当前 G4 开发网络

C296/C313/C356 的临时只读路由已移除，C51 已恢复原 G4 profile。当前绑定为：

| 项目 | 当前值 |
| --- | --- |
| profile／revision | `c51-tls-acceptance`／`4` |
| generation | `dev-20261011-04` |
| 完整 H0 | `BTrU3deMDbnWcUWLJ2ruDj9vbCC4gaYnVj8qV3K2nFah` |
| Fullnode gRPC-Web | `http://127.0.0.1:43150` |
| GraphQL | `https://127.0.0.1:43210/graphql` |
| archive gRPC-Web | `https://127.0.0.1:43203/archive` |
| account history | `https://127.0.0.1:43211/account/graphql` |

完整包与registry绑定保存在 `dev-20261011-04/C356-backend-generation-20261012-01/original-g4-profile.json`。[C356实际切回证据](./workLog/20261012-C356-backend-generation-completion.md)与C362界面核验共同确认当前状态。GraphQL、归档、账户入口使用独立测试profile已经信任的开发CA，不跳过TLS或SAN检查，不回退JSON-RPC。

[C360当前运行](./workLog/20261012-C360-current-runtime-completion.md)使用指定 `rtd` 最新源码的C347 debug产物；四个发生变化的进程已经正常更新，其余四种二进制与新构建逐字节相同。原H0、持续出块及76次真实业务读取已通过。环境与合约工具均位于 `link-u-smart-contract/all-in-one-deploy/localDeploy`。

重启时按当前 `runtime.json` 和各 `process.json` 核对真实进程身份，先存储，再认证/适配层、索引查询和公开入口；保留genesis、数据卷和journal。历史单次停机/故障脚本绑定旧PID、容器ID或operation，不能盲目重放。健康的当前进程复用，不重复启动。

G3仍是保留的旧H0对照环境，也是构建内默认开发profile和原待定交易的绑定来源；其旧运行产物按历史来源标记，不冒称刚刚升级。日常本次验收使用上述已保存的G4配置。C120/C139/C355是独立恢复测试环境，最终校验完成后按精确归属清理容器和进程，保留数据卷；`rtd-archive-events-hbase3`共享中间件不随临时环境清理。

## 当前验收与未完成项

名称、币转账、dApp、非空资产/NFT、质押与赎回已有真实链路；[REL-02审核](./workLog/20261012-C281-business-traffic-completion.md)覆盖25份普通Chrome HAR、3918个去重请求和6笔原执行，并保留失败与正文不足的例外。C280完整G4冷恢复、四入口与C51原账户/journal通过；C362只对新的验证者选择问题增加针对性回归和实际界面验收，不声称所有历史案例当天重跑。

账户活动仅承诺证书声明的类型和窗口。旧G3的一笔 `dispatch-pending` 按原H0/generation/账户/摘要保留并只读恢复，不因G4查不到而删除、重签或重发。当前网络兑换明确不可用；zkLogin创建/签名、Qredo执行、Ledger和法币外部业务按支持声明隔离，不能把入口禁用算成业务成功。

原0..709569全部41条管线重放、全数据/三账户比对及位图源码修复已经通过；同host换H0、同H0实际后端换代和迟到读取矩阵均已通过。WAL真实故障后的SQL29表53,813,169行、HBase14表83,387,096单元、Rocks8列族、归档8表与完整账户事实一致。仍待源端对象版本清单终结、归档fence持久复核、最终临时环境清理及98项交付终核，以leftProgress为准。

## 历史安装与验收记录

以下原内容保留其时间、包、环境与验收边界；其中“当前”“待验收”“trial_ready=false”均指对应历史轮次，不作为今天的安装/运行指令。未改写的原文另存[更新前全文](./workLog/20261012-C285-installation-guide-before-current-update.md)。

更新时间：2026-10-07。当前是可装载的验收候选，**trial_ready=false**；完整币／NFT／质押及普通Chrome HTTPS尚有未验收项。98项父任务状态以[Task.md](./Task.md)、[总进度](./totalProgress.md)为准。

## 历史 C44 开发观察包及严格来源传输后继

当前总体84/98、剩余14、trial_ready=false。加载目录为 `/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261006-03/certified-positive-production-C44-20261007-02`，产品1120文件SHA `1db4c584733b1a85733535c9336b1c7876a5c980171ff47ecb3b394da7ab638d`，实测Origin `chrome-extension://nbmpcfknfgjmecallhngcincnhklllpj`。当前生产构建／source-map闭包、质押金额草稿与完整M4范围见[当前工作状态](./workLog/current-state.md)；原C43安装状态见[完整归档](./workLog/20261007-installation-guide-before-C44-http11-switch.md)；下方C40、C39、C21均为保留历史，不作为当前版本或安装路径。

使用独立Chrome profile，在开发者模式加载本C44目录；保留原账户库、所有原执行profile及pending，不卸载或复制journal。当前`certified-wallet-dev/revision3`、generation `dev-20261006-03`、H0 `BkuLHhdtnoK7yLxo2eQuvcjHtdyipE7MMyxgTJiyHGg4`；Fullnode `http://127.0.0.1:41750`、GraphQL `http://127.0.0.1:41954/graphql`、archive `http://127.0.0.1:41955/archive`、account `http://127.0.0.1:41956/account/graphql`保持。没有新的C44 ZIP验收；此处明确指向已审核的独立解压产物。

[GraphQL HTTP1.1 H1–H6](./workLog/20261007-C43-http11-successor-design.md)继续保持，并已完成[C44严格来源S1–S4／S5a](./workLog/20261007-C44-http11-origin-switch-design.md)：只加入第13个实测C44来源，GraphQL仍经private mTLS41981到41840、fresh HTTP1.1 guard41980／pool8，archive41903／account41952保持。当前29钱包容器／14health、全部原进程／八debug／1015原私有文件保持。全局另有外部Java Testcontainers自然变化，数量按最新日志观察；不能将旧110／98总数作为固定要求。38实际新→旧rollback→最终新查询、84三入口规则及三私有TLS核验通过，确认退役旧C43 HTTP1.1 edge已精确删除，累计43；原完整recipe／logs保留，不执行docker start旧ID。重新创建旧recipe须新受控操作与真实H0验收。

[C44当前Chrome三入口](./workLog/20261007-positive-C44-transport-chrome-independent-01.json)实际renderer／worker匹配产物、五manifest origins包含、未知端口不包含，GraphQL H0／archive规范完整unary/status0 trailer／account实际响应通过。原C43九回执／M4资金与pending证据仅属原源码范围，不能合并当C44资金验证。NFT页面准入修复100测试与生产类型／闭包已过；正式publication401214及管线尚未到新夹具424677，完整C44非空NFT与资金回归仍待。

原C43历史入口九真实Chrome只读／独立native验证见[原回执读取](./workLog/20261007-C43-http11-indexed-receipt-independent-01.json)：57原GraphQL帧无读取error、原332734回执在S365010完整十域／Display覆盖且触发刷新，空journal和密文保持、正常重锁／退出；零模拟／签名／执行。此为独立开发测试profile／已登记闭合loopback下的实际范围，普通Chrome系统CA、原生权限批准／拒绝、全部资金业务与持续可用仍待，不能将本段作为已可试用证明。

最新[checkpoint连接复用隔离及独立核验](./workLog/20261007-C44-checkpoint-keepalive-independent-03.json)新增4个临时预览精确回收，累计**47**；两成功预览SIGINT退出130，初始失败／baseline137保留。无force rm、无卷／镜像／数据删除。候选仅10%吞吐增益、未达20%门槛，**未安装**；当前C44入口、guard／adapter／消费者仍为原运行配置。[最终环境02](./workLog/20261007-C44-performance-final-environment-02.json)29／14正常，未确认的12个退出容器与并行Testcontainers保留。

### 当前后继的系统重启恢复顺序

先检查Docker及当前所需中间件并按原保留genesis／数据恢复最新debug核心、原查询／账户worker／两个发布器，再恢复本后继Python listener。部署工具路径仍是指定 `link-u-smart-contract/all-in-one-deploy/localDeploy`，私有操作目录为 `/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261006-03/publication-foundation/native-query-http11-successor-20261007-01`。

```sh
/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-archive-service/localDeploy/data/publisher-venv/bin/python \
  /Users/changzechuan/WenchuanProjects/RTD-Blockchain/link-u-smart-contract/all-in-one-deploy/localDeploy/restore_wallet_http11_query_admission_after_boot.py \
  --state /Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261006-03/publication-foundation/native-query-http11-successor-20261007-01/listener \
  --operation postboot-http11-YYYYMMDD-NN
```

operation使用新的唯一标识；存活的正确owner会零信号返回。只允许经真实kern.boottime证明属于前次boot的失效记录，保存旧process／intent再按原命令恢复；同boot退出、同argv已存活、端口冲突、binding／源码／八debug变化均拒绝，须检查具体失败，不盲重启或修改manifest。Docker restart只负责当前HTTP1.1 ingress与C44 loopback容器，不代表Python已启动。恢复后的新PID须建立新的明确boot authority并实测H0／十域窗口，不能复用本轮旧PID快照宣称健康。当前只验收五谓词／协议unit与运行中零动作入口，尚未发生下次host boot，不预勾其验收。旧200000／283000／333000已终态有限任务不得重跑。

## C40 开发观察历史

当前QA-A22已完成[42实际UI／中英连接和撤销／密文冷重启／真实自然自动锁定](./workLog/20261007-QA-A22-current-C40-completion.md)，总体81/98，余17，trial_ready=false；不代表剩余indexed业务或普通Chrome HTTPS已通过。

当前目录 `/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261006-03/certified-positive-production-C40-20261007-01`；1119源码文件SHA256 `77df9a7637df9dbe4f08ef22caaf52744bd87c3f8626b9910dea47bb7dc12c39`，实际Origin `chrome-extension://omkbkbjpbnpnmfapnphjodcoipdikmpf`。独立测试profile已验证[32项实际界面及完整Chrome重启](./workLog/20261007-C40-ui-preferences-apps-chrome-01.json)、[原始Display与native独立审核](./workLog/20261007-C40-ui-preferences-independent-audit-02.json)；10定向／2637全量／两类型／生产完整source-map闭包通过。

绑定仍为`certified-wallet-dev/revision3`、G3原H0与四HTTP入口41750／41954／41955／41956；[九实际Origin／60门禁／三私有CA握手](./workLog/20261007-positive-C40-edge-audit-01.json)通过。普通Chrome HTTPS／原生可选权限仍未验收，不用私有CA握手替代。新prod产物独立于原dev dist，原C39账户库／产物／pending不变；加载与隔离步骤沿用下方说明，但选择本C40目录。

本次[28容器／14明确healthy／两套真实中间件](./workLog/20261007-C40-foundation-audit-01.json)正常。已清理21个确认被替代的无数据临时入口，其中最后C39入口在C40实际门禁／中间件复核后精确移除；所有卷／镜像／配置和数据保留。应用目录和已连接列表现在分别有中英文明确空态；加载中与已批准应用逻辑保持。当前历史NFT卡片对应索引snapshot123k左右，图片实际已转出、缺图NFT已放入framework，不能当作最新持有；原摘要不可重发。十字段索引尚未到180806，完整试用仍未达到。

本段优先于下方C39及更早版本的历史观察；连接授权及密文保留后续当前证据见[工作状态](./workLog/current-state.md)。

## C39 开发观察历史

本段优先于下方保留的 C21 安装与测试历史。当前加载目录为 `/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261006-03/certified-positive-production-C39-20261006-01`，1118产品文件，源码SHA256 `129b3e5873712087ce12d17c686e105cfcdf2d9621626570b0e1891ed79d69bd`。实际扩展Origin为 `chrome-extension://pecppogdmgcanbljfjbjklpnnonmfege`；只加载到独立profile，保留旧账户库与journal。

绑定为 `certified-wallet-dev/revision3`、generation `dev-20261006-03`、H0 `BkuLHhdtnoK7yLxo2eQuvcjHtdyipE7MMyxgTJiyHGg4`，入口依次为 `http://127.0.0.1:41750`、`http://127.0.0.1:41954/graphql`、`http://127.0.0.1:41955/archive`、`http://127.0.0.1:41956/account/graphql`。当前八个实际Origin白名单保持，未知入口拒绝；[54门禁／八H0／三TLS握手](./workLog/20261007-positive-C39-edge-audit-01.json)通过，私有CA握手与普通Chrome HTTPS验收分开。

当前123项定向、2632项全量、两套类型及生产完整闭包通过。C37 历史真实Chrome的非空活动／三种预览／Display隐藏，以及两笔 NFT 的独立链上成功证明保持原版本范围，不能改称 C39 已执行。C39 新目标单次转移按[自身读取保护清单](./workLog/20261006-C39-nft-owned-read-fence-design.md)验收，PersonalKiosk 按[当前 generation 清单](./workLog/20261007-C39-personal-transfer-design.md)推进；全部父项继续依原完整合同审核。

重启恢复后[当前28个钱包相关容器](./workLog/20261007-postboot-current-docker-C39-01.json)运行，其中14个明确healthy，其余没有healthcheck；两套TLS SQL、正式发布授权和持久HBase均实际读取通过。[最新在线读取](./workLog/20261007-postboot-online-independent-audit-01.json)14 HBase最低94419、23 SQL最低95469、4 Rocks最低94412，原在线命令／Display谱系／发布授权保持。三个账户API及六个worker已完成C36源码绑定和封存SQL提交独立审核。恢复helper现包含已存在的正面账户两个worker；再次重启时先核对每个owned身份、当前源码/reader/schema SHA，再恢复缺失服务，禁止重复启动健康进程。

第二次系统重启的当前状态以[20261007恢复清单](./workLog/20261007-postboot2-recovery-design.md)为准：两原H0／当前八debug及25原命令查询账户进程恢复、28当前容器／14明确healthy，两套SQL／HBase及两个发布器通过；[三API六循环05](./workLog/20261007-postboot2-all-account-audit-05.json)实际覆盖与拒绝合同成立。原链冷恢复窗口已追平；本批精确清理20个已停止且确认被替代的无数据loopback容器，未删卷／镜像／配置。C39门禁使用[本次重启独立审计](./workLog/20261007-postboot2-C39-edge-audit-01.json)，原C38入口已确认清理，旧证据中的“停止保留”仅为历史。

当前C39[直接Display NFT单次转移](./workLog/20261007-C39-direct-display-transfer-design.md)15Chrome检查／独立原签名和受控目标owner通过，checkpoint198775；该图片NFT目前已在另一个受控开发账户，原seed归源账户只为历史。原严格pending[实际主机重启后](./workLog/20261007-postboot2-C39-pending-host-audit-02.json)完整保留及明确持久拒绝通过，未重发。framework180806和上述转移的indexed刷新、名称当前高度新鲜度及普通Chrome HTTPS仍待完整验证，trial_ready=false保持。

## 1. 产物与安装（C21历史）

- [C21 ZIP包](/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261003-01/rtd-wallet-dev-20261006-03.zip)，2,526,637 bytes，SHA256：`823288196aa42d6ce9a30c43dfa6d6141e3eecbbdce27801d12ba669f7f058b8`。
- 解压版目录：`/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261003-01/trial-package-20261006-03`。
- 36个扩展运行文件，manifest v3；源码图／compilation graph仅留在审核目录。成员SHA见[C21打包证据](./workLog/20261006-C21-package-01.json)。包内没有账户库、私钥或journal。旧C19／C20 ZIP与目录保留，旧说明的精确版本见[C19历史说明](./workLog/20261006-C19-install-guide-before-C20.md)与[C20历史说明](./workLog/20261006-C20-install-guide-before-C21.md)。

1. 先使用独立Chrome profile，保留现有钱包浏览器profile与其账户库，不卸载原扩展、不清理存储。
2. 打开`chrome://extensions`，启用开发者模式，选择“加载已解压的扩展程序”，选择上述解压版目录；如果使用ZIP，先解压并选择包含manifest.json的目录。
3. 打开扩展，默认Local绑定为下表。安装不会恢复已有账户；创建／导入账户属于独立操作，原七条journal不能复制到新库或删除。
4. 检查四入口状态。当前普通Chrome只能验证Fullnode HTTP；三个HTTPS入口已实际失败（实际Fetch为TypeError），应显示不可用／错误，不能当作空资产或零余额。开发CA信任操作尚待确认，不提供忽略证书错误的安装步骤。

## 2. 固定绑定与debug来源（C21历史）

| 项目 | 值 |
| --- | --- |
| profile／revision | certified-wallet-dev／2 |
| 完整H0 | 3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj |
| generation | dev-20261003-01 |
| Fullnode gRPC-Web | http://127.0.0.1:39400 |
| GraphQL | https://127.0.0.1:39600/graphql |
| archive gRPC-Web | https://127.0.0.1:39603/archive |
| account history | https://127.0.0.1:39606/account/graphql |
| RTD source HEAD | 49a05a0de323b45a49d067a855c419e98d071afc |
| source diff SHA256 | e6702a206c6d0a4780ccb2f8d9c869317c65d006e96c3acf2da213f5df5571b3 |
| 构建profile | 指定rtd源码的debug；不使用release或旧源码二进制启动dev |
| 部署工具 | link-u-smart-contract/all-in-one-deploy/localDeploy |

端点和进程是本次观察值，不能在重建或更换generation后沿用。本批未重启服务／Docker／链，保留原数据和genesis。11个伴随进程拥有身份及八debug文件来源见[运维观察](./workLog/20261006-independent-release-owners-01.json)。进程存活不能代替每个API的功能证明。

当前产品C21源码1108文件，SHA256：`f867a8d4d44ff1c7b578c7e041b488fd2759b569d4553f651f18b9edbada4715`。开发dist和独立审核生产候选05已构建；C21将显式外部gas owner的单签execute在后台准备／批准token之前拒绝，UI明确共同签名要求、禁用批准而允许拒绝；发送方只签名流程保持。C19／C20源码、产物和包均为保留历史，不能把旧成功执行改称C21实测。当前八个debug文件／RTD HEAD和diff见[只读来源核验](./workLog/20261006-TX-01-current-debug-01.json)。[本批修复合同](./workLog/20261006-sponsored-execute-design.md)和各实际Chrome／签名记录分别注明范围；[C21原字节授权88项实际矩阵](./workLog/20261006-TX-01-authorization-matrix.md)及[当前来源审核](./workLog/20261006-C21-current-revision-audit-01.json)通过；内部全入口和gas变化再次授权仍开放。

## 系统重启后的恢复入口（2026-10-06）

本段及`workLog/current-state.md`优先于下方保留的C21历史观察。两套Docker中间件真实访问、原H0/保留数据、当前八debug文件及原命令恢复见`workLog/20261006-postboot-recovery.md`。脚本均位于指定`link-u-smart-contract/all-in-one-deploy/localDeploy`，以原配置/genesis/数据恢复，不执行genesis或清库。PID不能跨重启沿用，须读取本次严格身份记录。

`restore_wallet_after_system_boot.py`按`--runtime dev-20261003-01|dev-20261006-03`和`--stage core|core-ready|companions|publisher`执行；原主链core另按`resume_wallet_debug_dev.py`及真实只读证明finalize，不能重复启动已有健康实例。PNG通过原fixture启动，macOS解释器exec后的身份终验由`finalize_wallet_display_media_after_exec.py`完成。

新链旧有限回放缺少HBase终态，保留为未通过；独立`certified-postboot-catchup-20261006-01`已实际自然退出并完成14/23/4持久目标75097。`catch_up_wallet_postboot_certified_prefix.py --action resume --operation-name certified-postboot-catchup-20261006-01 --replay-name certified-postboot-replay-20261006-01 --output <新证明文件>`已恢复三个在线消费者，禁止对已恢复进程重复执行。在线窗口和业务接口仍须独立读取确认；Gauge启动零值不能覆盖HBase/SQL持久证据。

账户独立根67667到冷窗口75097的连续桥接见`workLog/20261006-postboot-account-bridge-design.md`。桥接须prepare的原生连续quorum及正式发布核验通过后，再import原谱系增量、核对真实reader及启动原bounded worker，不能改batch1000、原sealed根或手工推进水位。当前完整试用门槛仍未达到。

## 3. 已验证范围

- 全钱包当前179文件2525项与类型检查通过，赞助拒绝6文件108项定向通过；C20历史裁剪分类10文件263定向通过，真实水位推进不再单独制造永久身份Fault；本批质押12文件145项覆盖BCS及渲染夹具。
- 独立生产候选实际构建、全部5277模块／2033源码／7个JS块闭包审核通过，没有旧JSON-RPC requester／旧Kit；[C21生产审计](./workLog/20261006-sponsored-execute-production-audit-01.json)。39种旧方法字面量、SDK别名、嵌套模块、全部入口与source map都纳入审核。
- 三基础包与当前OriginByte独立认证发布pin，24,451个检查点，22份源码与3个编译模块逐字核验；最新服务14只读请求匹配，错pin正确降级。可选names／PersonalKiosk／原生Kiosk当前未配置，不声称这些业务已经通过。
- 原实际账户S586007／epoch3非空active、四条跨epoch率、精确归档bytes及奖励估算0；10000率表策略是显式BCS夹具，非生产网络性能／正收益／兑付证明。
- 实际双向交易／事件分页、空终态、type过滤及故障矩阵通过；实际与合成负例分别标明。
- 原七journal与旧失败profile保留。C20历史独立新账户资金试验：普通／导入签名81项、4消息签名／2交易签名、6模拟／0Execute；另一个全新profile成功执行106项、8签名／12模拟／2Execute与重启原journal保留，分别记录，不混为一轮。[QA-A09审核](./workLog/20261006-QA-A09-completion.md)又核验既有真实失败交易在C20的原digest／BCS／签名／12项失败收据UI；未制造新C20失败提交。QA-A01历史账户升级116项完成，QA-A09已收口；总体66/98，完整试用门槛仍未达到。

C21当前同合同回归另行通过：普通／导入成功106项、8签名／12模拟／2成功单次Execute及重启保留；历史真实失败原摘要的当前Fullnode重读／BCS离线验签／12项C21失败UI通过，未重复失败广播。C21 A09复核与当前来源见[本批完整记录](./workLog/20261006-C21-completion.md)。完整gas／未来Epoch／赞助拒绝88项在另一个profile独立验证，两批不混为一轮。

## 4. 待验收与回归顺序

1. 完成独立Chrome profile的公开开发CA信任确认和实际导入，重启后验证UI与worker四入口；host permission批准／拒绝另验。
2. 网络／SDL／coverage／独立包声明实际接入当前UI，验证ready、降级、错链、generation变化和迟到请求拒绝；服务软件部署签认单独完成。
3. 补齐币发送表单、非原生金额／metadata及发送全部，完整赞助／expiration授权与所有pending故障恢复；普通／导入dApp成功签名执行和真实失败回执已有上述有限证据。
4. 直接NFT／隐藏资产／Display、Kiosk／PersonalKiosk／OriginByte完整持有和转移；当前非空资产与包ABI不替代转移验收。
5. 当前质押详情、活跃赎回批准／链回执；名称部署、账户历史范围、read-after-write、保留数据冷启动、回滚及最后逐项审核。

发生网络／schema／包错配时暂停对应能力；保留账户密钥与pending journal。已广播交易只按原H0／generation／账户／digest恢复，不重新构建和发送。此候选没有JSON-RPC故障回退。清理旧包或回滚之前，以REL-03的完整验证结果为准。
