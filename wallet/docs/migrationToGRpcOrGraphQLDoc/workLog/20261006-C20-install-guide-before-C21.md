# 开发验收包安装与回归说明

更新时间：2026-10-06。当前是可装载的验收候选，**trial_ready=false**；完整币／NFT／质押及普通Chrome HTTPS尚有未验收项。98项父任务状态以[Task.md](./Task.md)、[总进度](./totalProgress.md)为准。

## 1. 产物与安装

- [C20 ZIP包](/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261003-01/rtd-wallet-dev-20261006-02.zip)，2,526,347 bytes，SHA256：`39cf8a948b9e2e5c148d6b9220a965eed9f4f4531420abd6b1489f8c1745da38`。
- 解压版目录：`/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261003-01/trial-package-20261006-02`。
- 36个扩展运行文件，manifest v3；源码图／compilation graph仅留在审核目录。成员SHA见[C20打包证据](./workLog/20261006-C20-package-01.json)。包内没有账户库、私钥或journal。旧C19 ZIP／目录保留，旧说明的精确版本见[历史说明](./workLog/20261006-C19-install-guide-before-C20.md)。

1. 先使用独立Chrome profile，保留现有钱包浏览器profile与其账户库，不卸载原扩展、不清理存储。
2. 打开`chrome://extensions`，启用开发者模式，选择“加载已解压的扩展程序”，选择上述解压版目录；如果使用ZIP，先解压并选择包含manifest.json的目录。
3. 打开扩展，默认Local绑定为下表。安装不会恢复已有账户；创建／导入账户属于独立操作，原七条journal不能复制到新库或删除。
4. 检查四入口状态。当前普通Chrome只能验证Fullnode HTTP；三个HTTPS入口已实际失败（实际Fetch为TypeError），应显示不可用／错误，不能当作空资产或零余额。开发CA信任操作尚待确认，不提供忽略证书错误的安装步骤。

## 2. 固定绑定与debug来源

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

当前产品C20源码1106文件，SHA256：`7aa9ed8d71bf404b115b7475f4f85e274cbf980c19c447fed416763951aaa46f`。开发dist和独立生产候选04均已构建；候选编译独立发布registry，UI／后台实际装载字节、签名与执行及最终包证据分别记录。C19源码、开发产物、候选03和旧ZIP保持历史版本，不能将旧证据改称C20。[当前来源审核](./workLog/20261006-native-retention-revision-audit-04.json)重建并核验旧C19，当前八个debug文件／RTD HEAD与diff核验见[只读来源核验](./workLog/20261006-C20-current-debug-02.json)。

## 3. 已验证范围

- 全钱包当前178文件2520项与类型检查通过；裁剪分类10文件263定向通过，真实水位推进不再单独制造永久身份Fault；本批质押12文件145项覆盖BCS及渲染夹具。
- 独立生产候选实际构建、全部5274模块／2032源码／7个JS块闭包审核通过，没有旧JSON-RPC requester／旧Kit；[C20生产审计](./workLog/20261006-native-retention-production-audit-01.json)。39种旧方法字面量、SDK别名、嵌套模块、全部入口与source map都纳入审核。
- 三基础包与当前OriginByte独立认证发布pin，24,451个检查点，22份源码与3个编译模块逐字核验；最新服务14只读请求匹配，错pin正确降级。可选names／PersonalKiosk／原生Kiosk当前未配置，不声称这些业务已经通过。
- 原实际账户S586007／epoch3非空active、四条跨epoch率、精确归档bytes及奖励估算0；10000率表策略是显式BCS夹具，非生产网络性能／正收益／兑付证明。
- 实际双向交易／事件分页、空终态、type过滤及故障矩阵通过；实际与合成负例分别标明。
- 原七journal与旧失败profile保留。C20独立新账户资金试验：普通／导入签名81项、4消息签名／2交易签名、6模拟／0Execute；另一个全新profile成功执行106项、8签名／12模拟／2Execute与重启原journal保留，分别记录，不混为一轮。[QA-A09审核](./workLog/20261006-QA-A09-completion.md)又核验既有真实失败交易在C20的原digest／BCS／签名／12项失败收据UI；未制造新C20失败提交。QA-A01历史账户升级116项完成，QA-A09已收口；总体66/98，完整试用门槛仍未达到。

## 4. 待验收与回归顺序

1. 完成独立Chrome profile的公开开发CA信任确认和实际导入，重启后验证UI与worker四入口；host permission批准／拒绝另验。
2. 网络／SDL／coverage／独立包声明实际接入当前UI，验证ready、降级、错链、generation变化和迟到请求拒绝；服务软件部署签认单独完成。
3. 补齐币发送表单、非原生金额／metadata及发送全部，完整赞助／expiration授权与所有pending故障恢复；普通／导入dApp成功签名执行和真实失败回执已有上述有限证据。
4. 直接NFT／隐藏资产／Display、Kiosk／PersonalKiosk／OriginByte完整持有和转移；当前非空资产与包ABI不替代转移验收。
5. 当前质押详情、活跃赎回批准／链回执；名称部署、账户历史范围、read-after-write、保留数据冷启动、回滚及最后逐项审核。

发生网络／schema／包错配时暂停对应能力；保留账户密钥与pending journal。已广播交易只按原H0／generation／账户／digest恢复，不重新构建和发送。此候选没有JSON-RPC故障回退。清理旧包或回滚之前，以REL-03的完整验证结果为准。
