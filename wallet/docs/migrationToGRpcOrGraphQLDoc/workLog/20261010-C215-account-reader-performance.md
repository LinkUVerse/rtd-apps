# C215：账户内部 reader 准入复用与普通 Chrome 验收

## 实际变更

C214仅替换外层HTTPS入口的准入。C215继续把实际账户reader的 `publicationAdmissionEndpoint` 从41892改为既有42030精确前缀guard；除此字段，reader的根、凭据、cursor key、内部GraphQL地址、并发、H0全部保持。API binding只修改readerSha256字段，与实际文件保持一致。完整原配置与binding仅在0600私有运行目录备份，不写入workLog。

部署目录 `~/.local/state/rtd-wallet-migration/dev-20261006-03/publication-foundation/C215-account-exact-prefix-reader-20261010-01`，脚本为合约仓库localDeploy/optimize_wallet_C215_account_reader.py。prepare/apply均检查原master及worker身份、当前环境、完整fresh visibility、3边界正例/21损坏授权隔离反例。仅向原master29848发送一次SIGHUP，保留birth、argv和41951监听；原worker29853退出，新worker98277正常启动。不直接向worker发信号，不停止链、publisher或索引，不新增容器。

已核对本地安装的gunicorn arbiter/app/worker源码；官方[信号说明](https://docs.gunicorn.org/en/19.x/signals.html)描述HUP启动新worker并平滑退出旧worker，未preload时重载应用。当前argv未preload，目录无隐式gunicorn.conf.py，启动器使用明确限定环境。异常路径恢复原reader/binding后再HUP，不强杀worker。

## 验证

- 63个backend源码文件及schema与原binding完全一致；不是修改业务代码或放宽准入。
- `20261010-C215-account-reader-applied-01.json`：真实C51 coverage三次2120.833/2051.754/1907.930ms，H0/覆盖正文通过；错误来源403，错误链返回GraphQL错误。读前与读后准入均保留。
- `20261010-C215-current-scope-01.json`：36父进程、116容器、24健康基础服务及C214外层变更保持；新reader字节仅上述URL替换、binding仅摘要替换，新worker身份存活，master保持。后续观测使用capture_wallet_C215_current_query_scope.py，旧C214 reader固定摘要检查不再代表当前配置资格。
- 普通C51 Chrome仍C210。原生 `activity-after-01.har` 首周期6请求均200且完整解析；独立 `activity-har-audit-01.json`核对H0、owner、覆盖窗口0–863173、pin/read/revalidate一致以及完整空结果。
- 首周期13393.751ms，较C214的18011.973ms降低25.64%；较切换前22442.418ms约降低40.32%。只是当前样本，不宣称固定时延。
- HAR另包含下一轮一个coverage请求，单列为未完成周期，不当作第二轮完整验收。未把当前空窗口声称为账户全集或非空资金/NFT验收。

## 当前交付与剩余

P211-3服务耗时分解与已确认传输开销修复收口；完整逐页面/非空范围仍由P211-4/P209-6及原父项承担。C213钱包构建未改变，也尚未安装，最终具体升级确认仍待回复；本轮服务变更无需更换当前扩展。

已关闭DevTools并返回首页。原98父项仍93/98，签名恢复12/12和dev协议8/8已完成，QA-A15/A17/A20、REL-02/REL-05继续按完整证据收口。

## 最新后台依赖

C215实读41条持久管线最低215174，215175/709570=30.3247%，剩494395；Consistent实际12686–215174，仅表示进度，不是全重放验收。正式发布仍1006768、pending1482841、prepared64177、锁1；父93647和子8386实时存活，子CPU继续增长。未干预运行中的发布任务。

下一步源码审查发现：账户历史调用GraphQLSnapshot.open时已传入固定窗口，但仍分开发送admission与pin；可评估把已知checkpoint的两个读前查询合并为一次请求。尚未修改或声称实现，需保留H0、head、完整覆盖区间及读后复验，并进行拒绝反例和真实浏览器验证。
