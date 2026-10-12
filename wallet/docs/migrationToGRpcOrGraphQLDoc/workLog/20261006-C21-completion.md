# C21：赞助提前拒绝、当前正常执行与验收包完成记录

按[修复前合同](./20261006-sponsored-execute-design.md)、[普通执行设计](./20261006-C21-public-execution-design.md)和[失败收据只读设计](./20261006-C21-failed-receipt-design.md)完成本批有限范围，98父任务仍66项完成。

当前源码SHA f867a8d4d44ff1c7b578c7e041b488fd2759b569d4553f651f18b9edbada4715、1108文件。五个旧产品源已保存，新增共享赞助判断及测试；背景对显式外部owner单签execute在准备前拒绝、不注册token；UI明确提示共同签名并禁止批准、保留拒绝。当前coordinator和Redux落盘后未知恢复策略不变，未通过错误文本清记录。双方交易技术文档同步规则，Sui官方完整TransactionData双签要求保持。

6文件108定向、179文件2525全量、完整prod类型实际通过；独立开发／审核生产候选05同源码构建，5277模块2033源码7JS闭包审核通过。原C20源码可由五份旧源及两新增文件清单重建相同SHA；原候选04、开发产物及ZIP02保持。新C21 ZIP03共36成员2526637字节，SHA 823288196aa42d6ce9a30c43dfa6d6141e3eecbbdce27801d12ba669f7f058b8；候选及最终解压目录普通Chrome实际三UI脚本／worker与磁盘相同，0外部／禁止请求／页面错误。

[完整gas／赞助／未来Epoch矩阵](./20261006-TX-01-authorization-matrix.md)88项／10实际签名／14正式模拟／0派发通过，两个账户的gas None与外部owner未来epoch5保持完整字节，两个准备拒绝及journal保持成立。该profile与下列正常执行profile独立，不合并计作一轮。

[当前正常执行](./20261006-C21-public-execution-01.json)106项／8实际签名／12启用检查模拟／2单次Execute，五阶段正常重启和两条原成功journal保持。普通账户摘要37mEK8qMqNHUhyitoA2dAbk4gzaJRfsrvb9UmHSBK2E4，导入摘要ELH3jNk7RBrjFtHLLKWEo3ja6WvvypKSTxiReAbr55Uu；每笔1原子单位自转账。独立[原摘要审核](./20261006-C21-public-execution-audit-01.json)重新读取完整BCS／effects／签名／终态，0新增签名／模拟／Execute，证明新赞助守卫保留普通执行。

历史实际失败d4kE2koaXQ829UWnhXd8exWawWa37zEuzCfA7WLdkRC仍仅原一次派发。本批[当前Fullnode重读](./20261006-C21-failed-native-01.json)、[当前原BCS离线验签](./20261006-C21-failed-signature-02.json)及[C21失败收据12项](./20261006-C21-failed-receipt-ui-01.json)通过：原checkpoint390790／MoveAbort、gate closed=true／visits0、原digest及标准FailedTransaction保持；查看前后journal为空相同，原成功profile文件只读SHA保持，无模拟／派发。原七profile没有打开或操作。[C21 A09复核](./20261006-C21-QA-A09-audit-02.json)通过，不是新增父项或新失败提交。

当前总来源见[C21当前版本审计](./20261006-C21-current-revision-audit-01.json)；旧C19／C20核验器及审计仅历史。两个已注资失败矩阵profile和helper原字节保留，原主harness单独快照同名冲突缺口准确标注，第三轮按全相对路径保存。独立签名与A09审核首次启动路径写错，仅启动日志01失败、未运行profile／链操作；修正路径后02实际通过。首次状态更新stdin编码错误未修改目标，随后明确UTF-8正常写入，不能将失败启动计作验证。

最新RTD HEAD／diff及八debug仍一致，本轮17个本任务Docker容器Up；真实native／Move／发布只读探测通过。未重启dev／Docker／链或部署合约，沿用link-u-smart-contract启动的原debug环境，原数据／genesis保持。Node私有CA只用于单进程；普通Chrome三HTTPS仍TypeError，CA未导入，host授权／全部TLS和功能门槛未通过。

父66/98（67.3%）、余32，trial_ready=false。TX-01内部币／NFT／质押全入口、gas变化再授权、其余金额／多窗口／提交后切换／真实回归继续按Task.md推进；不会用本轮有界C21正常执行替代其余合同。
