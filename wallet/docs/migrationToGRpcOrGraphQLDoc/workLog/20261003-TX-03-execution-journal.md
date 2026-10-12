# TX-03 journal 与 background 执行推进记录

日期：2026-10-03。完成TX-03；TX-01／02／04–07／09–12、RPC-09／14／20／24继续实施，不以币发送局部路径代替全入口完成。

## 改动与理由

新增execution-journal：schema v2身份／scope／request／摘要及白名单回执；原生IndexedDB strict readwrite、transaction complete屏障、pending与scope原子写入、terminal与释放原子写入。保留v1 store并对无法证明完整链身份的非空旧记录隔离；读／写均拒绝隔离数据。不保存私钥／签名／完整待提交交易。事务不等待网络；失败不会在广播前误判成功。

新增execution-reader：私有binary Fullnode gRPC-Web，前后H0／水位校验、总预算、重定向／凭据限制。同最终bytes执行前SignatureVerificationService验签；ExecuteTransaction只发一次；回执必须含原BCS、原digest、签名、完整effects与一致状态／gas／epoch。GetTransaction仅实际gRPC NotFound返回未确认，其余错误保守pending。

新增execution-coordinator：Web Locks同H0／generation／地址互斥，先查旧request／pending；保留TransactionData Intent和本地digest，签名后验签，strict提交pending后才能dispatch；未知只恢复原摘要，终态落盘失败不释放。赞助签名未实现前明确拒绝该入口，不重写gasOwner。

新增background/execution及类型化UI消息：只接受已有origin-checked扩展UI连接；account每边界核对selected、未锁定／未删除、地址及profile绑定，事件关闭迟到会话。恢复只读允许锁定账户。名称从background新解析且验证实际TransferObjects目标；签名仍由原账户私钥域执行。内部originRef不是dApp授权合同。

币发送页撤出旧signAndExecuteTransactionBlock／useSigner执行；固定批准bytes传给background；未知显示原digest、禁止发送、只读恢复；重新打开也恢复当前链账户。回执页面和GraphQL索引等待还未迁完。zkLogin current-epoch撤出getLatestRtdSystemState及旧URL缓存，改同链Fullnode当前epoch；每次新读，安全整数与切网结果检查。

## 权威依据和文档对齐

查询Sui官方Wallet Builders、官方sui-apis Ledger proto，与本地SDK实际GetServiceInfo／Execution／SignatureVerification／Transaction／effects BCS对照。官方epoch明确来自最高已执行checkpoint，不把预计结束时间当签名时实际epoch。官方fixed commit文件及SHA在evidence/official/sui-execution-browser-manifest.json；最初错误仓库raw访问cache miss未用于结论。IndexedDB3.0工作草案将strict定义为durability hint，需transaction complete；Web Locks生命周期与durable占用分离。同步wallet05／archive04第8节，内容逐字一致，原目录与冻结原文保留。

## 验证结果

- 343/343定向测试，26文件，exit0：实际SDK binary gRPC-Web／Transaction／Intent与BCS，背景授权／锁定／切账户／错误名称目标；含7项Fullnode epoch与4项background配置测试。
- 原生Chromium153.0.8010.12，9/9：strict完成屏障／落盘白名单、注入quota原子回滚、独立连接pending竞争、URL别名与generation、坏回执不解锁、链失败BCS原子释放、v1保留隔离、两页Web Locks互斥、实际service worker停止并重启仍发现原摘要。
- rpc/core及直接依赖定向typecheck exit0；完整钱包exit2、169诊断，新执行／epoch／发送文件无诊断；未声称全工程构建通过。
- 原生浏览器测试运行的是loopback harness，其worker读取真实IndexedDB记录；没有真实链、真实扩展UI、设备签名或完整worker执行故障验收。不得记为TRY／QA通过。

日志：20261003-execution-tests.log、execution-typecheck.log、after-execution-typecheck.log、execution-journal-browser.log、execution-format-check.log、execution-inventory.log。SHA／计数与未验收范围：evidence/20261003-execution-verification.json。

## 后续与进度

仅勾TX-03，12/98=12.2%。NFT／质押／dApp／Qredo、modern Wallet Standard、zkLogin凭据链绑定、自动worker恢复、Archive裁剪恢复、GraphQL写后读覆盖、历史回执新模型、最终bundle无旧请求均待完成。全接口和真实核心链／Chrome、安装试用包及22类回归继续推进，当前不可试用。本批不启动环境、不杀旧recovery、不改链DB／部署合约；后续使用最新源码debug与指定link-u-smart-contract脚本。
