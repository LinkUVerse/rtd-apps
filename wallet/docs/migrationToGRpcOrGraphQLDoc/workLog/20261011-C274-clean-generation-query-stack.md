# C274 修复后干净代次的完整查询服务

2026-10-11。依据本轮允许重置dev链/索引、且源码缺陷必须修复的授权，使用C273已通过持续推进、完整认证前缀和保留数据库重启的dev-20261011-04。原G0/G3及原钱包待定交易证据继续保留。

新H0：`BTrU3deMDbnWcUWLJ2ruDj9vbCC4gaYnVj8qV3K2nFah`；协议139，5000ms检查点周期，300000ms epoch；Fullnode/Faucet端口43150/43151。所有原生服务使用C273当前源码debug构建。

实施顺序：认证来源及0..50种子 → 独立发布身份/副本/认证发布 → Guard/KV/HBase/SQL/consistent/GraphQL → archive/account公开准入 → 当前Chrome业务、重放及冷恢复。使用link-u-smart-contract/all-in-one-deploy/localDeploy的部署入口；完成各子包后立即更新leftProgress.md，不把环境启动当成业务通过。

端口参数化复用了既有generation KV/query启动器，默认端口及旧配置绑定格式保留；新实例采用43180系列KV、43140系列query，避免与原G3冲突。隔离验证器通过独立debug目录绑定，旧已部署验证器SHA保持。

当前（2026-10-11 22:28）：认证种子0..50已发布并独立校验，持续source/publisher已启动；Guard、HBase writer、Ledger、23项SQL配置、4项consistent和GraphQL正在摄取新链数据。GraphQL实际同链读取及archive经TLS的H0/检查点0读取已通过。浏览器C51 Origin预检已通过，复用用户先前批准的独立profile测试CA服务端身份，没有新增浏览器/系统证书信任。

## 当前源码与传输修正

- 旧Guard镜像与当前源码不一致，重新构建当前镜像并校验代码，当前镜像`sha256:4e32a684c754fdcfad94ffee7814548307b4891dc3219aa3263e8ead5b5e5199`。
- 既有bridge Origin增补脚本只支持render.py，现支持bounded_render.py并核验基础renderer SHA；初次拒绝保留，随后C51 Origin受控补齐。
- TLS桥接首次Node请求未配置测试CA，失败保留为`bridge-read-01`；使用明确CA且不禁用证书校验后`bridge-read-02`真实读取通过。
- Publication和account原生helpers已在隔离debug目录按当前源码编译。快照元数据修复后再次编译，6个helper均与先前产物逐字相同，原publisher默认路径保持。

## 合约编译发现的真实源码问题

名称publish第一次在Move编译阶段失败，尚未模拟、签名或派发。协议139新snapshot的`git_revision`由bin-version生成，带`-dirty`后缀；rtd-package-alt要求40字符Git SHA，触发`manifest has valid sha: WrongLength`。

修复rtd-framework-snapshot生成逻辑：仅移除明确的-dirty显示后缀，校验40字符十六进制；未知/短/其他后缀拒绝。139条目改为实际完整HEAD；其五个framework bytecode未变，<=138旧协议条目未变。新增clean/dirty与非法标记回归。当前正在完成测试、8服务debug重编译及保留数据重启，不通过清库处理此缺陷。

## 摄取性能观察及后续

初始三个consumer各并发1，在真实adapter读取100/101/102检查点分别约1403/797/2167ms；主链产出约1cp/s，串行摄取无法快速消除启动积压。准备在Guard8许可内将adapter4→6、三consumer各1→2，所有校验保留，原配置/数据库保留；实际吞吐需水位验证。此配置准备不算业务验收。

后续：完成当前debug重载→部署name/Display/PersonalKiosk/OriginByte夹具→account索引及API→当前Chrome实际业务→授权重置后的完整代次回放、比对、冷恢复。

## 证据

- `20261011-C274-certified-publication-01.json`：0..50完整认证发布。
- `20261011-C274-direct-graphql-01.json`：实际同链GraphQL。
- `20261011-C274-bridge-read-02.json`：验证CA的TLS archive读取。
- `20261011-C274-name-preflight-01.json`、`display-preflight-01.json`：当前原生能力及ABI。
- `20261011-C274-account-helper-build-01.json`：隔离account debug工具。
- `20261011-C274-snapshot-revision-tests-01.log`：快照revision回归（以最终退出结果为准）。
- `20261011-C274-consumer-budget-tests-01.log`：并发许可边界回归。

27个原子包未收口；本日志不把环境/源码/夹具准备当成名称、NFT、质押、冷恢复或完整终验通过。

## 22:43 更新

快照revision的2项回归、8服务debug及6个隔离helper均构建通过。C274当前debug相对C273仅rtd/rtd-node二进制变化；其他6服务和6helper字节相同。按绑定重载来源元数据、5个查询相关进程和原生链；原生保留1484个文件并验证SHA，未重建链数据。初次探测在RPC端口开放前失败，`after-native-restart-02`的30秒持续推进随后通过，`native-ready-01`记录原生就绪，不宣告完整查询/合约验收。

新并发配置已实际运行。`query-window-02`在22:39观察一致范围1487..1579、Ledger1579；`sql-watermarks-01`读取数据库23条持久水位，历史Display1361，其余1484/1485。证明正在推进，仍需全管线完整业务覆盖。

名称、Display、PersonalKiosk分别在检查点1612、1624、1636发布成功，每次一份bytes、一签名、一次Execute，均按原摘要确认。OriginByte首次编译要求已发布依赖；显式合并依赖又因上游同名frozen_pub模块冲突被编译器拒绝，两次均未模拟/签名/派发。保留失败目录，改为沿既有部署顺序pseudorandom→utils→permissions→request→kiosk独立发布并写入实际Published.toml，保持合约结构。

## 22:59 更新

OriginByte五个独立包全部发布，kiosk检查点1756。名称seed1786、Display mint1792、两个既有C51测试账户fund1798均按原摘要确认。独立原生名称审核确认5个正向字段、2个反向字段、真实缺失、过期/无目标/错误父NFT分支及10项固定root/field反例，见`name-native-01`；这不是钱包名称解析通过。

账户prefix0..50已认证并导入独立最小权限数据库，PersonalKioskCap类型采用新发布包；token/capability持续worker、API43205及TLS准入43206已启动。浏览器GraphQL43210/account43211复用已批准C51证书，后端使用新代次CA严格校验。首次Nginx上游名称127.0.0.1匹配失败返回502，随后明确核验真实localhost SAN并修正SNI；没有关闭TLS校验或新增证书信任，旧配置保留。`four-public-roles-01`确认Fullnode、archive、GraphQL、account四个入口同H0，覆盖至少1798；不把allAccountActivityCertified=false改为true。

当前真实名称解析仍因新鲜度拒绝：`name-resolver-01`捕获Fullnode1898、四个GraphQL名称依赖范围上界1837，首个名称未返回目标地址，0模拟/签名/Execute。未放宽规则，后续必须解决正式发布延迟与名称即时验证的联动。

按当前源码编译的隔离debug exporter已将名称、PersonalKiosk、OriginByte分别从genesis完整核验到1612/1636/1756；5/6/3模块均通过仅自地址迁移后的字节级比较，合并6个包时公共framework pins完全相同，当前root/field重读通过。原G3发布配置完整保留，新增一个G4精确profile绑定。

C275生产构建与全产物闭包审核通过（5295模块、2039来源、7个JS块）；产品源码1137文件SHA与C257完全相同，只增加受证书审核的新链发布配置。37项registry回归通过。未重复宣称全量2893项回归本轮重跑；当前扩展升级/Chrome验收仍待完成。
