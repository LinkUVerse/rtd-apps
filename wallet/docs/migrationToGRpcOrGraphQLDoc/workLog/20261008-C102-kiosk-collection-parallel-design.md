# C102 完整 Kiosk 读取的期限内并发修复

先保存原1120产品文件的完整SHA清单、原a03构建及将改写文件／双方文档，再建立Task，之后编码。原C101 02完整页面行为与独立原正文失败、03／04实际source持有失败均保留，不重开旧profile。04已保存真实缓存pending／两个TimeoutError／三个暂不可用卡片截图；真实原始GraphQL回复无业务errors，不能据此称当前页面可用。四次实际同查询Node读取1105–1857ms，原browser4078–4797ms；不同时间／调用者，只用于定位，不能声称受控性能改善。首个诊断使用错误extension Origin被403拒绝，没有保存原正文，不能当成功样本。

## 要实施的完整合同

WalletAssetReader.kiosks保留原同一个GraphQLSnapshot及外层60000ms，两个已配置的完整native（framework＋Personal）／OriginByte分支并行开始；单分支和未配置行为保持。各分支分页、cap、owner、UID、canonical BCS、shared version、登记表、锁／独占、完整数量及自身末验保持。只在两分支都成功、合并无重复ID并且原外层末验成功后返回原冻结完整列表，顺序仍native后OriginByte。不能少查对象、跳过末验、返回partial／空占位或延长期限。

本次operation有自己的AbortController，组合原caller signal及原60秒期限；任何分支失败、重复ID或末验失败，以及整轮成功退出，均取消此operation剩余读取，不关闭共用session、不取消其他查询。两分支最大新增同时在途2，仍由原session／gateway permit约束，不改服务配置、信任、publication marker或debug。

测试必须先在原实现复现串行无法同时开始的失败，再证明两完整分支并行／正常native+OriginByte顺序、不能在只完成一个分支时交付、失败／外部取消／60秒自动取消、重复ID拒绝／末验失败、native-only／OB-only／未配置。原资产、所有native／Personal／OriginByte及reuse／Provider关键回归继续。构建新的独立production产物，原C46和dist保持；完整产品SHA增量只准许asset-reader与新测试文件，其他原1120不变。新真实13／5／3／6 API与C88独立原帧及新的三个空CFT完整页面仍须实际通过；构建／单测不得收口原五父任务。

## 顺序

P102-1：原产品与文档封存、现场原帧诊断及实施合同。
P102-2：原串行反例→并发修复、取消／完整性及原受支持分支回归。
P102-3：精确产品source delta、完整TypeScript及独立production构建／真实source map和闭包审核。
P102-4：新完整API及三账户真实页面／原始consumer+Network帧独立审核，逐原父合同收口并更新细分比例。


## 新构建来源与专用三入口验收

新build02没有manifest.key，扩展ID须从实际空CFT worker读取，不能用不存在的manifest字段推测。首轮Origin准备错误TypeError证据保留；未启动网关／执行业务。原C48只接受旧C46路径对应的kiahl...来源，新独立构建路径不能冒充该身份，也不修改原网关白名单或旧产物。

P102-4b：在link-u-smart-contract/localDeploy新建独立当前C98完整ownership受控网关脚本；先只复制原profile的三个入口端口至42011／42012／42013（必须实际空闲），其他全部字段严格相同。新build03仅编译此profile，产品763d9082不变；新CFT空profile实际worker／UI hash及Origin、原manifest精确主机权限先独立验证，零私钥／签名／Execute。仅允许该实际Origin的专用TLS／方法配置从原C48精确单map增量生成；一个正常临时网关＋nginx语法自动退役容器，保留原所有容器／actors／debug／1456／publisher状态。完整新source／三个入口资格不降低任何C100 API或C101完整三账户／原帧审核；新source helper只接受原1119不变、同763d与确切三个profile端口的build03，历史失败和资格不改写。实际完整页面及独立typed checkpoint末验结束后按精确ID正常清理此自有临时网关，保留卷和原服务。P102-4依然要实际完整通过才勾。

新三端口profile严格拒绝旧registry，第一次build03在编译／输出目录创建前失败，保留独立失败收据。按原C46受控离线发布衍生流程，仅更新明确reviewId与profileBindingKey；原证书输入SHA、六package／module／版本／generation／H0及全部声明字段保留，旧新profile与registry必须互相拒绝。先独立验声明／registry再使用新registry构建03，不合成原证书或改变默认信任。

当前新source完整API01的前71库存／54固定版本／18六详情原回复已取得，源历史9行在两页取得8行后60000ms期限失败，148回复全保留。P102-4c仅把本次完整验证工具的合法pageSize从4改5；源9与已有目标6仍真实跨页，新目标1页。产品history默认20、1–50合法区间、统一60000ms、全部行canonical／snapshot／cursor／全账户false标志与13／5／3／6保持，不延长期限或跳验。先逐字逆向及10政策检查，再fresh七门重新执行完整API；原01失败不改记通过。


## 完整原正文观察器的取消分级

新完整API与独立原帧已通过164；浏览器01在源账户三个Kiosk已经显示后，首次导航前flush因正文留存失败拒绝，173 Network原正文／36消费层原文、2个原请求ERR_ABORTED保留。原观察器没有输出失败阶段和signal状态，不能断言唯一原因。

P102-4d：新观察器仍立即返回原fetch Promise及原Response；先独立保留原requestBytes，再clone body，分别记录clone／request-body／response-body／record阶段和实际request signal.aborted／reason。仅response-body阶段的真实AbortError且原signal.aborted为true可作为取消的未完整clone，保存原url／requestBase64／headers及取消事实，永远不作为完整正向响应。非取消、请求正文失败、clone错误或保存binding失败仍flush拒绝；即使signal已取消也不能豁免保存错误。flush必须等待全部留存任务。完整审计仍从实际Network＋完整consumer原正文解码每条必须业务页面、全部13对象／三个完整历史／六详情／typed S，不以取消行补齐缺少的正面字节。新增真实可读流取消及非取消／保存错误对抗检查，再以02全新三个profile执行完整测试；原01不重开、不改记通过，产品／网关／source资格不变。

P102-4e完整父合同最终审计：原C102实施前Task中RPC-22／23、TX-08、TRY-05和QA-A07五项原剩余范围保持，结合原C48六条实际转移／原基础资格、新完整API原帧、新三个profile完整页面原帧与typed末验、当前1121／763dsource及严格独立transport证据逐字段审核。必须十三Native前后／五cap／五Kiosk页／八NFT细节／三个9-6-1完整窗口／十二原receipt view／六原交易、正常锁定关闭／journal和密文保持、risk-disabled及未认证全集flags均成立；全局parentCompletion不得由局部脚本自称。独立审计通过后才更新五个UI细分包与原Task父项，不增加98分母，ENV07／普通Chrome／其余父保持。此审计不启动或签名Execute、不替代新页面原文审核。

独立UI审核01失败于取消clone头关联，34累计／3唯一原回复均已按x-rtd-request-id匹配唯一实际Network响应，唯一差异是Vary顺序。基于RFC9110§5.1／12.5.5仅比较Vary字段名列表的大小写不敏感token多重集合，重复数保持；其他全部头值、URL／role／原请求bytes／status／真实reply ID继续严格匹配，业务原文不改。新v5只增加Vary比较helper和精确单处使用，原v4失败保留；实际三owner 955／356原文不重造，先真实三对头及增加／删除／其他头差异拒绝资格后重跑完整独立审核。

P102-4f运行前审核修正：原C101合同明确“迟到只读cancel与未成功帧保留分类，任何业务必需回复不得用失败替代”。实际browser02三个504已同时留存Network与consumer，精确自有gateway的原日志匹配三次连接上游超时；v5无区别要求全部帧200超出了该合同。新v6只允许这份已固定SHA的02证据内三个已匹配网关日志的GraphQL只读504，逐一按role／完整request／status／完整headers／完整body关联唯一Network与consumer，时刻／host对应原日志且数量精确一致，单独返回全部原文和negative计数，永不加入成功业务解析集合。其他非200、漏配／头体不一致／日志不符仍拒绝。全部成功回复、十三前后Native／所有GraphQL对象／9-6-1完整历史／六原BCS-effects／typed S／12receipt／三页面与正常锁定关闭审核逐字保留；任何必需数据缺失仍失败，不能用失败或UI缓存补齐。先实际三对与漏配／增加／身份／status／headers／bytes／日志计数反例检查及完整源逆向资格，再执行完整独立审核。原independent01／02失败不改写，新的03复验继续；连接底层根因和整体可用性不能由此宣布已修复。

P102-4g编码前：independent03严格失败于历史对象单次GetObject不存在，原记录保留；实际已有24个archive BatchGetObjects完整请求／回复（Network12＋consumer12，source6／已有5／new1），与双方03／04中的WalletArchiveObjectReader.objects批量路径相符。新v7只补此实际方法的独立逐槽位解码，原单GetObject及其余全scope审核逐字不变。必须请求显式ID／规范version、完整九mask、槽位数量／顺序与object oneof；每项完整Object BCS canonical／Object::digest／UID／version／type／owner／contents／previousTransaction与wire及本轮13Native规范事实严格一致。三个角色的十二receipt请求都要对应自己的固定版本；不生成单GetObject假帧或把UI显示当正文。先24个实际batch及缺槽／错误oneof／ID-version／mask／BCS／owner等offline负向检查、源逆向资格，再执行完整独立。产品与源profile、全查询方法合同均不变。
