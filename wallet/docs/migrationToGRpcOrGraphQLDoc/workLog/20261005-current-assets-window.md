# 2026-10-05：共同资产窗口恢复与入口建连失败定位

任务：RPC-03／22／23、NET-04／11、ENV-05、TRY-02／05。父任务未勾选，48/98，trial_ready=false。

## 已验证事实

只读窗口观察及等待驱动均已结束：2026-10-04T16:56:49Z候选Ledger176734／consistent176712–189654；没有为等水位重启消费者。生产WalletAssetReader随后实际接纳S176808、digest D1LDzEBbVMtDfpNyzLdV9k92VJqzVpnyJmfm6GKtuwVn，五组字段全部成功、13对象、完整单页、0模拟0广播，见[字段证据](./20261005-current-assets-fields.json)。候选观察本身不算资产准入。

固定S的display查询原生端832ms通过，公开端2932ms返回HTTP200＋GraphQL INTERNAL_SERVER_ERROR，见[端点隔离](./20261005-current-assets-display-endpoints.json)。OriginByte两账户只读验证在S177064完成第一账户的新鲜对象比对和两条未签名转出命令检查，第二账户dynamicFields返回partial，72请求后整体失败、0模拟0广播，见[完整失败记录](./20261005-current-originbyte-two-routes.json)。display=null不证明历史模板正确；本批未运行Chrome验收。

发布可见性16次配对检查全部成功，不能据此把故障归因于marker竞态。consistent尚不强制发布上界，不允许把其检查改成query-prefix绕过。当前授权监听器确为publisher-venv Python；三种surface顺序请求均204、387–471ms。

## 建连层证据与下一步

私有nginx日志仅输出无凭据分类：[63次超时全部处于连接授权服务阶段](./20261005-ingress-timeout-phases.json)，包含16:57:42 display及16:58:42 NFT失败。尚未进入授权检查，不是SQL或HTTP读取超时。运行解释器Python3.9.6，ThreadingHTTPServer默认request_queue_size=5；并发8路仅调用/live（不执行发布／PG检查）32次中24成功、8个URLError，[原监听器测试](./20261005-admission-backlog-before.json)。Python官方文档说明监听队列可通过子类覆盖，满队列会拒绝连接：https://docs.python.org/3.9/library/socketserver.html#socketserver.TCPServer.request_queue_size。

接下来仅调整监听连接队列到32，保留原8个检查、32个请求和逐请求新鲜fail-closed检查。保存原绑定与进程证据，经身份核验后受控替换该Python监听器；核心及原生消费者不重启。先重复只读建连测试，再验证实际完整资产／NFT／Chrome。修复和实际结果尚未完成，不提前记通过。

## 权威Display合同

已完成D1：按固定Sui官方commit核实VersionUpdated发布时序，历史模板必须按checkpoint／transaction／event定位S前最后一次发布，不能按Display对象当前状态或最大version推导。D2–D6已拆解，双方SDK章节已对齐，见[设计](./20261005-display-history-design.md)及[文档验证](../evidence/20261005-display-history-document-verification.json)。实现及真实历史Display验收仍待推进。

## 监听修复与实际回归

L2已完成：指定合约仓库启动器采用AdmissionHTTPServer，TCP backlog=32。guard源码／配置及manifest未改，仍8个发布检查、32个请求和逐请求新鲜认证；没有扩大checkpoint适配器预算。受控脚本先保存旧launcher／绑定／命令／进程身份，核验后仅SIGTERM原PID86054一次、确认退出与端口可绑定，再启动替代PID11462；不强杀、不自动重放，过程原件保留。六个原生服务身份全部一致，核心和消费者未重启。见[替换结果](./20261005-admission-backlog-apply.json)。

[5项运维回归](./20261005-admission-backlog-tests.json)通过，含真实内核listen队列的原类失败／新类16连接全部接纳，以及原身份变化、PID复用、停止超时保留、仅单次SIGTERM。相同并发8路/live从24/32成功变为32/32；扩展256/256成功，Docker零I/O TCP24/24成功。三个合法surface分别204，unknown403。见[部署后证据](./20261005-admission-backlog-after.json)。这是建连修复证明，不替代完整查询或试用验收。

固定S176808端点复测：原生555ms、公开1027ms，HTTP200无GraphQL错误、同H0／digest和13对象，两者通过，见[对照证据](./20261005-admission-backlog-display-endpoints.json)。旧失败原文件保留。

实际生产OriginByte完整两账户回归通过：S182969、digest H4vqdiiJWtQeQ1DJu5vKL8i7CVBXkkC7yD1CXyCk6cFY、123请求、0模拟0广播。两个NFT的版本／digest／BCS／owner／类型均与Fullnode新鲜对象一致，OwnerToken视觉后隐藏分类与Kiosk完整读取成立；错误sender拒绝，既有收方p2p_transfer及新收方p2p_transfer_and_create_target_kiosk两条未签名命令检查通过。见[完整证据](./20261005-admission-backlog-originbyte-two-routes.json)。不包含签名／gas解析／实际NFT广播、隐藏状态持久化或Chrome非空NFT页面，display=null亦不证明历史模板合同；RPC-03／22／23不据此勾选父项。

当前Chrome只读资产／锁定／重启验证进行中；正常CA、自定义权限及D2–D6仍未验收。任务48/98、trial_ready=false。

## 稳定性限制：Chrome失败与后续入口超时

Chrome只读资产测试已结束，exit1，阶段local profile asset query，TimeoutError，pageErrors为空，0模拟0广播，见[失败原记录](./20261005-admission-backlog-chrome-assets.log)。未进入资产卡片／锁定／重启验收。修复后入口日志仍出现Docker→主机39592的建连超时；新监听队列解决原本机突发接纳缺陷，但不能据此认定所有公开建连故障已消除。实际挂载nginx配置与原文件SHA一致，残余超时目标全为192.168.65.254:39592，均在connecting to upstream。完整NFT单次通过保持；当前入口持续稳定性未通过。

接下来在独立临时只读nginx入口对照原2秒与5秒建连预算，记录实际upstream_connect_time；生产配置与原生进程保持，不能以增加等待时间猜测解决。须有真实对照证据再决定后续修复，L3仍未完成。

## 建连预算对照与Chrome真实根因修正

隔离nginx对照已完成并移除临时容器：2秒和5秒各40个consistent授权请求全部204，所有成功建连耗时均低于2秒；生产配置保持。[对照证据](./20261005-admission-connect-comparison-03.json)不支持延长生产建连超时，未采取该调整。最初两个临时配置仅在nginx -t阶段分别因多余闭括号、默认临时目录指向只读文件系统失败，原日志保留；修正全部temp路径后第三次才执行实际80请求，不能把前两次计为测试通过。

Chrome增加脱敏只读流量观察后再次在local profile asset query超时，但GraphQL请求数为0：[第二次失败](./20261005-admission-backlog-chrome-assets-diagnostic.log)。这两次Chrome失败不能归因于发布503。检查当前UI／后台构建，均未包含审核Local registry；AST验证实际拒绝，[原产物检查](./20261005-compiled-local-profile-before.json)。之前只核对产物摘要、外部profile及fixture身份，不能证明产物内置了该配置。

现用reviewed profile03 revision2、API_ENV=local及显式WALLET_NETWORK_PROFILES，仅重新构建钱包开发产物；原47M产物已保存于runtime/wallet-extension-before-local-profile-20261005。开发Webpack成功、构建期间应用／core／SDK源码摘要保持；[构建与AST证明](./20261005-reviewed-local-extension-build.json)逐JSON字面量核对UI（1处）与后台（4处）registry和审核profile完整一致，校验不执行bundle。新增[4项校验测试](./20261005-compiled-local-profile-tests.log)通过：双入口、任一缺配置、endpoint／revision差异、仅标记字符串均正确拒绝或通过。Chrome Local测试启动前强制此校验，缺配置直接失败，不再等待45秒或错误推导入口故障。

新UI SHA90c2d492671d620e5ab4fee79309bc83d815adbec100a5834e768b8c2b064773，后台SHA05b4e235093f20812ad0385db7db9af9dfd19f890608ef5987b0038fecab1f24。四入口[provider](./20261005-reviewed-local-provider-audit.json)与[39方法wire闭包](./20261005-reviewed-local-wire-audit.json)重新审计通过；不把静态审计当动态流量或全功能验收。当前新版Chrome验收结果待完成；Docker原入口残余建连问题继续单独定位，D2–D6待实施、48/98不变。

## 本轮最终页面恢复

新Local配置排除未配置构建后，真实QueryClient又复现切网清缓存使存储迁移ready门禁停滞的问题。hook已补齐缓存消失后的重新核验，14项定向／132文件1418项／tsc／开发构建及双入口AST／四入口静态审计通过。最新Chrome实际S189657余额、10非视觉对象／链接、Kiosk卡片和空详情、密码／锁定／整浏览器重启均通过，0模拟0广播。详情与所有历史失败见[独立修复日志](./20261005-storage-migration-cache.md)。当前UI c446dd／后台05b4e2；L4／L5完成本批有限验收，L3持续稳定性和D2–D6仍待推进。


## D4：历史服务能力与钱包basis的编码验证

服务scope能力／coverage与钱包固定S、来源、模板basis已接入；两个Rust库38／249项绑定同一当前源码、sourceUnchanged=true，新增4项实际PG。钱包133文件1463项、完整tsc、开发构建及静态闭包通过。最新产物UI c017238／后台95f84a尚无Chrome验收；上一批c446dd／05b4e2的页面证明保留为历史结果。历史schema／认证回放／原生新debug服务尚未部署，当前源码不能沿用旧debug provenance。D5–D6继续，48/98、trial_ready=false。见[完整日志](./20261005-display-history-admission.md)。
