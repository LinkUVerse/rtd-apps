# C205 剩余验收与当前阻塞

签名授权与持久恢复12/12；指定dev环境与浏览器协议8/8，均100%。总体92/98（93.9%）；QA-A19的更新/权限/CA-SAN细分70%包完整通过后，原98父项等权的细分剩余5.41%。原父项剩余6项，不把部分验收当作父项完成。

## 本轮普通网页 CORS

使用同一独立C51普通Chrome打开本仓库demo只读页面，实际Origin为`http://127.0.0.1:41960`。没有代理请求、覆盖Origin或扩展消息转发；fetch使用`mode:cors`、`credentials:omit`。8条实际HAR包含四组POST/OPTIONS：

- native41750：OPTIONS/POST均200，网页可读126字节；离线解析完整GetServiceInfo protobuf和唯一grpc-status0，H0正确。开发节点响应ACAO=*且无Allow-Credentials，这是本机开发节点当前策略，不宣称严格网页来源限制。
- HTTPS archive41903：OPTIONS200但缺ACAO，实际POST被Chrome阻断，HAR状态0、net::ERR_FAILED。
- GraphQL41957及account41959：OPTIONS403，实际POST被Chrome阻断。虽然403预检带ACAO，也不能算允许读取。

初次审核错误地要求未发送的POST含Origin，Chrome对这些条目只保存provisional headers，因此失败；修正为严格要求同URL的实际OPTIONS具有精确Origin，未发送POST必须具有正确Referer、页面脚本initiator、状态0及ERR_FAILED。没有放宽成功正文或CORS判定。最终`20261010-C205-demo-cors-audit-01.json`通过。

**仍缺的正例**：私有查询服务对获准普通网页来源的成功响应尚未实测。归档配置允许`https://wallet.test`，但该名称当前未解析到本地；C51 GraphQL/account网关仅允许目标扩展Origin，不允许本次demo Origin。不能将修改白名单后的测试代理效果冒充当前部署验收，也不能以原生节点成功替代全部私有入口。下一步需准备与生产部署模板一致的独立demo入口及明确来源绑定，验证正确TLS和获准网页来源，再完成QA-A19的30%细分包。本项是可继续实施的测试环境缺口，不是永久或不可绕过阻塞。

临时静态服务位于localDeploy脚本，PID89614仅绑定127.0.0.1:41960；无Docker新增、无代理、无链业务写。采集后正常Ctrl+C退出，端口已关闭，demo标签页已关闭。证据`20261010-C205-demo-cleanup-01.json`。原C51权限继续保持恢复后的“在所有网站上”。

## 真实发布／重放依赖

`20261010-C205-retained-all41-watermarks-01.json`：23SQL、14HBase、4Rocks的41条持久管线最低196293，覆盖196294/709570=27.6638%，尚差513276个checkpoint。只读检查使用当前源码debug与既有部署，primaryWriteApiCalls=0、无服务信号。查询一致范围12686–196295，不代表完整历史恢复。QA-A17/20仍缺全0–709569、全数据对照、两账户、物理归档和WAL验收。

`20261010-C205-publication-progress-01.json`：published1006768、pending1482841、prepared33680、advisory lock1；原publisher父93647、工作子14257仍存活，状态更新时间距观测8335秒，handoffAdmission=false。没有证据允许停止/重启该发布工作；不能将长时间未更新直接判定可安全交接，也不能将prepared数据算正式发布。名称新鲜度和依赖正式发布的后续全量验收保持阻塞，未放宽20checkpoint尾部约束。

## 开放父项

| 父项 | 未完成条件 |
| --- | --- |
| QA-A15 | 当前正式发布/索引追赶后，名称八例与改名/续期/过期真实验收 |
| QA-A17 | 完整固定范围重建、全量比较及浏览器完整换代/迟到请求 |
| QA-A19 | 私有入口获准普通网页来源CORS正例与demo完整矩阵末审 |
| QA-A20 | 完整dev保留数据冷启动顺序、全物理归档/WAL及普通Chromejournal保持 |
| REL-02 | 当前所有功能完整实际流量审计 |
| REL-05 | 所有必需项完成后的逐文档/接口/页面/QA最终审计 |

没有因目标比例而勾选上述父项。普通Chrome余额准入提示仍保留，业务未准入原因需要继续核查；身份预检和ENV完成不等同全部钱包功能可试用。
