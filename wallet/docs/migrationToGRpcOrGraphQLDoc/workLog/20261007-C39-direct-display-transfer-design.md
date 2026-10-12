# 当前 C39 直接持有 Display NFT 转移

使用受控 G3 开发夹具图片 NFT `0xbca970d965b7f00170947216c3483a501208812f68876c2e81aa7c8eb6a778af`，目标选择同一开发 keystore 中另一个受控账户；原严格 pending profile 不打开，不重复发送此前 C37 direct／OriginByte 或 C39 Personal 交易。

- [x] D1：当前源码八 debug、原 H0／六 pin、PNG 与当前 C39 完整产物一致；真实 NFT 卡片／Display 名称／图片及新鲜原生 AddressOwner 证明发送前仍归受控源账户。
- [x] D2：真实直接持有 NFT 表单，仅一次检查；原批准为 `direct` 路由，原字节只有 TransferObjects，正式 ENABLED 模拟与原交易摘要一致。
- [x] D3：原批准仅点击一次发送，先持久化原 attempt，实际 Execute 原请求／响应帧保留；终态 journal、自动真实成功收据与索引同步提示及重锁逐项验证。未知结果只查原 digest，禁止重试。
- [x] D4：独立校验原 BCS／签名／完整帧、规范 NFT BCS、最终受控目标 AddressOwner、原 native checkpoint，与 Display 模板及历史 seed 对齐。
- [x] D5：写后完整索引覆盖及受控目标账户真实Display NFT／收款活动／原成功收据已由当前C40 receipt03、receiver03及独立native02完成；不代称全部NFT父合同。

成功转出后，C37 Display／隐藏夹具中的源 AddressOwner 视为历史事实；原偏好、旧 profile／证明与两枚 NFT 的规范内容保留。另一枚缺图 NFT 已在 framework Kiosk 内，目标 checkpoint 180806 的索引前置仍开放。


[当前04](./20261007-positive-C39-direct-display-execution-chrome-04.json)15检查通过：实际图片alt名称／URL和32×32媒体、详情、原生新鲜持有者、直接TransferObjects完整批准、ENABLED原字节模拟、仅一次发送、自动成功收据／索引同步提示、confirmed-success／pending0、重锁保持。digest `FfQdNLvZB2cQeq24hVj5Pp2m4Mose7siWpubQ1Sxzpww`，checkpoint198775；NFT `0xbca970d965b7f00170947216c3483a501208812f68876c2e81aa7c8eb6a778af` 已转到同开发keystore内受控目标 `0x32707d815917729a49dc103a1b511f297de389b19600611fcc1a5cdb8b91dcb7`，此前seed AddressOwner为历史事实。

[独立native03](./20261007-positive-C39-direct-display-native-audit-03.json)确认原唯一签名、批准BCS／digest／完整Execute帧与实际native回执／effects一致，TransferObjects中的原对象version／digest和目标Pure Address准确，三个匹配批准BCS的正式模拟帧成立，规范NFT内容及原Display模板版本／digest／BCS不变，最终目标AddressOwner；audit0模拟／签名／Execute。图片URL及PNG原字节保持。D5仍待真实索引覆盖198775，不以链终态代替indexed刷新。

失败保留：Chrome01因工具bigint/string比较、02／03因工具误要求卡片名称文本（产品实际以img alt呈现）均在准备前退出、Execute0；04核验产品真实alt／图片并另验详情文本。独立audit01误读oracle display.value（实际为template），02对初始结构化gas-selection模拟误取BCS，原工具及failed记录保留；03仅选原批准BCS，同时保留检查ENABLED和完整帧，不重复发送。

D5a当前完整snapshot／原摘要覆盖S202285≥198775已由C40 receipt03及native01证明；D5b受控目标账户真正NFT/Display/活动UI仍未执行，D5总体保持开放。

当前完成覆盖历史D5待验叙述：C40 sender原摘要收据S202285≥198775；目标真正受控recipient正常UI导入后的当前C40 receiver03／native02在S204560完整十字段／Display证明，实际NFT图片32×32、规范详情、incoming活动、原收据、原PNG SHA与原生AddressOwner及BCS模板保持。原受控profile正常解锁／重锁、密文及完整三store保持；0新模拟／签名／Execute。原全账户活动／转移覆盖旗标仍false，不关闭QA-A13或TX08完整入口。
