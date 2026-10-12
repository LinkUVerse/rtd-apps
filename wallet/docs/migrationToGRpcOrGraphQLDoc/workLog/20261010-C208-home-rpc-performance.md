# C208 首页RPC性能与操作入口

## 任务与已确认事实

用户要求排查每次刷新GraphQL请求过多及发送/兑换/质押按钮禁用，可自动修复的直接修复。以C207普通Chrome原HAR为基线，不将Keep log累计128条误称每次刷新128条。

首页同时打开完整Display资产快照、余额独立快照、完整质押视图及币种元数据；余额自身由admission/pin/read/revalidate四步组成，保留H0、固定S、覆盖与终页校验。质押视图包含系统、全部验证器、非活跃池、汇率表和账户仓位；20秒总期限触发时会取消动态字段与StakedRtd对象请求。首页只为决定质押卡片是否出现便启动整套查询，超出首页所需。

发送：当前币种余额为0，disabled={!tokenBalance}。兑换：还要求apiEnv=mainnet且DeFi feature开启；当前自定义dev不满足，不能为了可点而伪造主网或开放未配置兑换。质押：无RTD时固定禁用，另一个卡片也依赖完整质押成功且当前币种余额非0；这会阻挡没有流动余额但已有质押的管理入口，需修复。

## 实施边界

先减少首页不需要的完整资产与质押扫描，相关功能在进入对应页面后继续完整读取和校验。质押入口直接进入管理页，最终新增/赎回仍由原准备/费用/签名校验控制。零余额发送和未启用兑换保留限制，但给出可见原因。不得删除安全校验、缓存旧授权或伪造余额，不给测试账户自动转款。所有代码/构建与普通Chrome验收分开计数。


## 已完成的代码与构建核验

首页停止完整NFT/Display快照预加载，切换其他页面继续原完整校验；首页不再调用完整质押视图。质押入口始终导航到管理页；发送保留非零余额条件，兑换保留主网/功能开关/余额条件，并显示具体原因。最终源码摘要6136282e56db1c6ffd4528e8ddae9b8794fd192c5943a5f63d84fd90b29d14aa，1123文件。

97项回归通过（20261010-C208-regression-03.log）；production/rpc两项typecheck-02通过；production-build-01与production-closure-01通过；完整来源审核见20261010-C208-source-and-checks-01.json。生产模块6项变化，移除未使用TokenIconLink出包，后台模块、权限、网络配置不变。原targeted-01测试失败保留：测试夹具使用短币种类型，改成真实reader规范类型后通过，没有放宽生产校验。

## 性能根因与入口修复

C207首个刷新页面共21请求（20 GraphQL+1 GetServiceInfo），其中2条质押请求取消；128条是三次刷新及后续周期累计，不是每次刷新128条。完整HAR见20261010-C207-continuous-refresh-after-01.har。余额admission/pin/read/revalidate4步仍必要并保持；首页改动预期只保留余额和元数据8条GraphQL，最终以新浏览器HAR为准，尚未当作实测数字。

20261010-C208-service-latency-01.json：最小H0查询raw GraphQL约10–12ms，旧guard约0.88–1.02s，钱包入口约1.07–1.84s。独立只读profile见20261010-C208-guard-profile-01.json：1.4409s中两次ledger_snapshot全前缀聚合合计1.3112s，占约91%。

已核验并复用现有C148精确前缀guard42030与TLS入口42031：完整fresh visibility对象一致，36份输入SHA一致，负面合同、H0、主副本固定版本正文及前后校验保持，拒绝非法origin及无客户端证书。只将C51 loopback配置中的上游41981改成42031，对外41957不变；nginx -t及graceful reload成功，容器实体/镜像/启动时间保持，没有新增或重启容器。未缓存正面授权、放宽来源或TLS校验。

执行脚本：link-u-smart-contract/all-in-one-deploy/localDeploy/optimize_wallet_C51_graphql_upstream.py。完整操作目录：/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261006-03/publication-foundation/C208-C51-exact-prefix-upstream-20261010-02；prepared.json/applied.json通过，original-nginx.conf为完整回滚配置。第一次01在写入前因Docker挂载返回顺序不稳定被严格比较拒绝；修正按Destination排序，重新完整prepare后02成功。01失败保持。历史C51配置SHA不再视为当前运行资格，新配置由02证据绑定。

入口切换后样本：2.2239s（首次热切换窗口）、0.4635s、0.5633s；仅短样本，不承诺长期延迟。生产reader经同一41957入口实读：余额2377ms（checkpoint825173，完整空集合）、质押6779ms（checkpoint825181，1验证器，positions空）。见20261010-C208-live-readers-01.json及scripts/probe-C208-live-readers.ts。使用编译profile，不读取Chrome存储，不等同于用户customprofile或页面验收；0签名、0执行。

## 安装与当前验收边界

用户通过call_1bd98179ad6f48919528fcf3de94396d批准升级；prepared/user-confirmation/extension-disabled/installed等01证据均保留。独立普通Chrome原生停用后原路径替换并启用，原账户与ID保留，未读改profile数据库。完整C207备份：/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261006-03/certified-positive-production-C46-20261007-01-C207-retained-by-C208-20261010-01。

实际UI及worker静态源码逐字节核验通过：20261010-C208-ordinary-bytecode-02.json。01保留为失败：审核脚本沿用了C207生成chunk957；C208审核产物ui.js实际入口明确加载503/207，修正检查脚本后02通过；无生产包修改或跳过字节检查。

扩展升级清除内存解锁状态，已打开本地密码框，请用户自行输入原测试密码；不索取密码。P208-1/2/3/4/6完成，P208-5浏览器连续刷新请求数/真实按钮点击待解锁，未勾选。零余额发送限制、开发网络兑换不可用是正确条件；新增质押/真实转账需要实际资产及用户操作，不用假余额或自动转款替代。总92/98保持，局部修复不计作全部迁移验收。


## 普通Chrome实际验收完成（2026-10-10 20:28—20:31北京时间）

用户反馈没有解锁框、页面已解锁；本轮原生AX确认同一扩展ID和账户处于解锁状态。因此上一节“等待本地解锁”是历史状态，已解除，未再次索取凭据或重载扩展。

原生Network面板清空本轮记录后保留日志，三次完整首页刷新，每页恰好9条本地请求：8 GraphQL（余额与元数据各admission/pin/read/revalidate4步）+1 GetServiceInfo。共27条全部200，无取消或GraphQL业务错误。相较C207首轮20条GraphQL减少60%（全部本地请求21降9，减少57.14%）。余额三轮快照831313/831365/831406；原H0、固定S/digest、coverage、owner及空集合终页均通过；元数据也按独立固定快照核验。没有NFT/Display或完整质押扫描。原生导出20261010-C208-home-three-refresh-01.har（0600），审核脚本scripts/audit-C208-ordinary-balances.py，报告20261010-C208-ordinary-balance-har-audit-01.json。

刷新至余额最后网络复验：3.634/3.963/4.437秒；旧C207对应11.545/13.949/13.915秒。该指标来自HAR页面起始至复验完成，不冒称精确绘制时刻；原生UI分别确认三轮0 RTD正常展示。8条请求仍包含数据一致性必要校验，不应只按HTTP数量判断重复重试。

实际点击首页质押链接进入/stake，成功出现“选择验证者”和validator-0；选择后进入/stake/new数量页，显示“可用：0 RTD”，预览交易正确禁用；未输入交易金额、未签名或提交。发送0余额禁用、兑换自定义dev网络未开放，页面原因可见。质押导航HAR共52请求，包含停留时自动更新及数量页额外读取，不是一次首页刷新计数；49 GraphQL正文均无errors且H0/S/coverage通过，另有2 GetServiceInfo和1 GetBalance。见20261010-C208-stake-network-audit-01.json及20261010-C208-stake-navigation-01.har。未把gRPC HTTP状态当作完整业务校验。

关闭DevTools并返回首页，最终再次确认0 RTD、发送/兑换原因及质押链接。原生观察摘录20261010-C208-native-ui-acceptance-01.json；总验收20261010-C208-ordinary-acceptance-01.json。P208-5已勾，P208-1至6全部完成。仍不等同于非零余额变化、资金交易或98项全迁移完成；整体92/98保持。
