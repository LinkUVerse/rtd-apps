# CAP6 F2c.1实际后台身份授权接入持久准入

按[编码前设计](./20261005-network-admission-authorization-design.md)实施，承接[12来源实际接入审计](./20261005-network-admission-runtime-pre-audit.md)。[三份修改前原字节](../evidence/20261005-network-admission-authorization-before/manifest.json)与[修改前当前状态](./20261005-current-state-before-network-admission-authorization.md)保留。父任务49/98、trial_ready=false不提前勾选。

## 实际连接及拒绝边界

现有[transaction-network-identity守卫](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/shared/rpc/transaction-network-identity.ts)默认连接真实WalletNetworkAdmissionStore。withExecutionAccount已有signing授权调用链因此使用持久身份门槛；测试结构注入不构成生产缺IDB回退。先检查整个binding身份负面／pending，保留原高度capture，再strict提交实际已配置三角色观察占位，等待返回后才开始SDK身份IO。

正常三角色报告返回、原H0／高度和NetworkObservations提交核验后，原ticket完成空Fault决定并重读当前持久状态，再检查session／caller取消才返回identity-verified／identity-degraded。Fullnode有效而其它角色暂不可用保持显式降级，未产生能力／全网络ready、client或交易授权证书；已存accountHistory身份负面／pending也阻止新交易，但本三入口probe不伪造第四个bookend。

真实NetworkIdentityError先在本session设置即刻拒绝状态，再提交该原ticket的有限Fault，即使等待落盘期间session关闭也先保存负面。存储写失败保留pending；正常complete失败只尝试一次，catch不会自动空决定重试清占位。没有开始probe，或probe正常返回后局部失败，可仅完成自己的空决定并拒绝本次；probe提前取消／抛错可能早于忽略abort的叶子settle，无明确Fault时留pending，迟到成功不清除，也不伪造已知错链。

旧高度reset仍独立H0／generation；仅改profile revision不能绕过。生产execution／dApp readOnly恢复分支未改，不将门槛塞入journal升级或摘要恢复，不重提交原pending。领域schema／ABI按业务依赖、Provider状态／撤值、只读旧摘要完整反例及最终授权／发布竞争属于后续F2c.2／F1c–d／F3／F2d／F4，不能用一次末检说已消灭所有竞争。

## 验证与来源

[最终检查摘要](./20261005-network-admission-authorization-checks-final-01.json)保存直接退出码与日志SHA。新增19项：实际SDK守卫16项、真实后台入口assertClear／begin／complete失败的3项，后者零模拟／账户signData／journal commitPending／dispatch。三文件77定向和完整161文件2244项全部通过（完整73.59秒，maxWorkers=2、无筛选）；RPC／完整钱包／native harness三套类型及七文件格式实际0。既有后台fixture补restoreAllMocks防止存储spy跨测试遗留，不改生产execution／恢复代码。

[14项原生日志](./20261005-network-admission-authorization-native-02.log)加载实际guard、SDK公开protobuf／GraphQL帧与两个真实native store：正常提交／暂时失败恢复、begin及正负完成native put成功后abort、取消早于叶子settle、accountHistory已存负面、领域身份分离、旧高度reset及revision／generation、负面提交等待时关闭、未注入admission的production默认持久门槛、第二页／实际service worker停启／整个Chromium正常关闭重启均通过。33次SDK夹具transport调用不访问真实链；事件错误和外部请求0，实链／模拟／签名／Execute各0。没有真实钱包扩展核心Chrome、物理崩溃／断电或试用验收。

[79份当前来源](./20261005-network-admission-authorization-source-inventory-01.json)：72前批来源逐字不变＋七本批来源，修改前12审计输入只有守卫一份改变，已用原字节保存明确连接；三份旧业务／fixture源码原文保存，既有20原字节形成23份。1063产品文件SHA `5f046fc5748c55f343eed976a398752381cbfc24d56d1e075cf14e3bd40ee88b`，历史C9磁盘bundle不变、未新构建，SDK／RTD只读。未操作RTD dev、原journal或受保护回放。

## 首次失败、完整收口与剩余任务

[native01失败日志](./20261005-network-admission-authorization-native-01.log)、隔离失败profile及[初始脚本原字节](../evidence/20261005-network-admission-authorization-diagnostics/manifest.json)保留。初次拒绝夹具用nullish优先选DOMException数值code，使TimeoutError name被遮住；改为各公开错误标识分别匹配后native02实际通过，production guard未变。首两次定向分别74／77通过，最终03包含3项后台故障并清理spy；没有将首次失败抹成全通过。

[双方文档与来源末验](./20261005-network-admission-authorization-document-verification-final-01.json)及[精确verifier](./20261005-network-admission-authorization-document-verifier-01.py.txt)保留。历史预审守卫SHA按本次原字节核验，当前改动按当前清单SHA核验，不能以旧审计当当前守卫没改。F2c.1仅身份默认持久门槛有限完成；下一步观察协调／跨context撤值后重读、Provider NC5／受控registry、schema／ABI业务依赖、准确query取消移除及所有UI旧data、原摘要恢复反例、最终授权竞争、新产品构建与完整核心Chrome继续，全部父项及trial门槛未升级。
