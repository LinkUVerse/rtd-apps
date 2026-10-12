# C42 质押与赎回完整入口竞争

属于 TX-04 的 M4，原父合同保持开放。当前 C42 构建与真实origin注册已经完成，283000 G4已自然终止并恢复；原仓位332734仍需新的333000合格区间追赶。前置不更改交易状态。

- [x] S1：当前生产 staking-only reader 完整六依赖、单一 checkpoint、全部验证者和费率表读取；当前系统对象与规范原生数据核对，不能使用旧链验证者夹具。
- [x] S2：新链 keystore 受控账户的真实 native stake 对象、BCS／所有权及余额盘点。没有仓位就保留赎回前置未满足；不得注入对象或复用另一 H0 的仓位。
- [ ] S3：C42 当前实际质押和赎回表单，真实选择验证者／对象后与同 scope 正在签名的请求竞争；原 native Web Lock、准备拒绝、零新签名／执行、真实原签名过期结果与 journal 保持分别取证。
- [ ] S4：释放原只签名请求后正常 lifetime 重试，正式 kind 费用选择和最终模拟、sender／gas／Validity／原 fresh shared／owned 引用一致；真实 Back 取消和重锁，不以恢复入口守卫代替完整表单。
- [ ] S5：当前 UI／worker、原始 gRPC／GraphQL 帧、完整 journal 和规范 bytes 独立核验；失败和尚未覆盖的持久 pending／其他 NFT 矩阵保持开放。

S1／S2 使用未改变 endpoint 的新 C42 生产源码，只证明 Node 只读前置，不冒充扩展 origin／普通 Chrome TLS／质押或赎回完成。历史原 profile 不打开；原交易摘要不重发。需要新仓位时必须单独记录真实产品批准与唯一新摘要，不能先勾选 S2 或伪造成功。

S1 完整实测为[前置01](./20261007-C42-staking-preflight-01.json)：S257718 的六依赖、单一 active validator、完整一行epoch0费率，规范 Fullnode 系统对象与 indexed inner 字节／epoch／成员一致。S2 六个受控账户先全部空仓位，之后通过[真实新链夹具](./20261007-G3-staking-fixture-progress.md)单次 UI 批准创建332734仓位，独立核验原签名／BCS／owner／pool／principal及余额完成。**S2只完成盘点和原生夹具，不代表当前C42已indexed准入**；S3–S5等待[新333000区间S4/S5](./20261007-G3-staking-required-index-catchup-design.md)及真实共同S>=332734；当前C42origin已经实际注册，不继续重复G4或原stake。


## 当前完整表单实施前范围

原332734已在[生产仓位01](./20261007-C42-original-stake-indexed-production-01.json)与[独立01](./20261007-C42-original-stake-indexed-independent-01.json)实际通过：两个完整域均S333000，六依赖质押／十依赖拥有资产、完整四对象及单一验证者／完整费率页，29完整原帧与4个fresh独立原生帧；仓位pending、reward unknown/pending保持，不当作已激活奖励。新有限区间S5及恢复独立已完成；本节以下未覆盖窗口说明仅为实施前历史阶段。

实际Chrome01失败保留：391已采集帧／6个原读取body缺失，其中实际503/504，不是持续可用通过；打开赎回表单期间质押页因正常读取重准入回到“正在加载”，导致两个表单同时ready的断言失败，0模拟／0签名／0执行，Chrome自然关闭。新producer v3只等待两真实页面同时ready，不注入数据、跳过准入或模拟占锁；再记录两原完整表单后才启动原只签名锁。独立audit v3不变，实际S3–S5仍等待完整运行。

新333000有限操作实际已启动，在线独立审计01通过，仍inProgress/catchupAccepted=false。原仓位共同窗口尚未覆盖，不运行以下业务探针，也不预勾S3–S5。

1. scripts/probe-C42-original-stake-indexed.cjs：真实共同S>=332734后，生产完整六依赖质押域和十依赖全拥有对象，原唯一仓位与fresh native/V2系统一致；零密钥/模拟/签名/执行。
2. scripts/audit-C42-original-stake-indexed.cjs：独立全原帧/grpc-status0、typed Object/Checkpoint BCS、完整过滤和未过滤自然分页、V2/active validator/完整费率表。未来inactive分支不冒充已验。
3. scripts/test-C42-staking-forms-live-lock.cjs：新私有profile，实际导入受控原owner。先选择验证者并打开质押金额表单、原332734的赎回表单，两个Review均ready之后，才批准一次真实Wallet Standard只签名请求并私下延迟返回。实际两个原Review在同scope native Web Lock下分别拒绝、零竞争正式模拟/签名/执行及journal不变；不是只测试恢复守卫。原真实结果延迟至少31秒使egress lease失效，释放后原结果拒绝/锁及原signer恢复；实际质押1/2RTD和赎回三完整预览、正式kind fee/final共六模拟，原两个sign-only模拟单独记录，正常Back取消/重锁。全原HTTP帧、失败与关闭采集取消保留。失败清理也必须先等待实际31秒，不能通过清理交付有效签名。
4. 当前源码1119及真实C42origin不变，输入/产物SHA及原journal独立审核。只有运行结果与完整独立证据均通过才勾相应子项；当前仅完成脚本准备/语法检查。普通Chrome TLS、持久pending和其他NFT完整矩阵保持开放。

当前新增scripts/audit-C42-staking-forms-live-lock.cjs，准备独立核验全部八正式模拟原帧、两真实Review竞争、原31秒失败释放、规范sender/gas/Validity/系统引用/唯一原stake、完整journal及relock、关闭Chrome、fresh gas/stake/system/typed S。所有工具仅静态准备；实际测试仍等待真实共同S>=332734，S3–S5不预勾。

直接NFT当前实测后，另存test-C42-staking-forms-live-lock-v2.cjs与audit-C42-staking-forms-live-lock-v2.cjs：按真实/archive/...二进制及/account/graphql路径审核，正常允许原只签名VerifySignature并独立校验message.value/owner/本地签名；仍禁止一切Execute。八个关键模拟与原校验响应必须完整，原读取采集错误保留请求/状态/响应头和未验证body标记，不作为持续可用通过。原Review等待实际读准入恢复再点击，31秒失败释放仍保持。此修正仅工具准备，不改变产品源码或业务准入，尚未运行M4。

实施前复核另存 `audit-C42-staking-forms-live-lock-v3.cjs`，保留 v2。费用选择的三个 kind 请求不提供最终交易 BCS，逐项核验原请求／返回 kind、sender、gas owner、空输入 payment 与真实返回 payment，再与对应最终模拟核对 kind／gas／Validity。另五个最终 bytes 模拟（原只签名两个、质押金额两个、赎回一个）仍必须有规范 effects BCS、精确 bytes 与摘要。分别报告五个规范最终 effects 和三个 kind 费用选择，不声称 kind effects 已有 BCS。此版本仅语法检查通过，实际审核等待 M4 真实结果；S3–S5 仍未完成。
