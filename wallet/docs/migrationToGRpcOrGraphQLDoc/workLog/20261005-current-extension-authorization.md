# 当前Local扩展：批准字节、只签名与授权复测

日期：2026-10-05。按[C1–C5设计](./20261005-current-extension-authorization-design.md)推进；本批不新增链上执行。父TX-01、TX-10保持开放，49/98，trial_ready=false。

## C1：原执行记录与当前worker

[audit-05](./20261005-current-extension-original-journal-audit-05.json)及[最终audit-06](./20261005-current-extension-original-journal-audit-06.json)实际打开原dApp／staking两个保留profile，仅readonly读取既有IndexedDB v2。dApp5条（4成功、1链失败）、staking与coin2条成功；scope绑定完整H0／generation／原公开账户，pending-scopes为空、无隔离标记。7条原摘要通过实时Fullnode GetTransaction核对digest、状态、epoch、checkpoint及原生effects BCS；全程0模拟0广播。

每轮读取前后3个store的原始JSON SHA相同，两轮对应profile的逻辑SHA也相同；没有升级、审批、解锁或业务journal写入。实际worker源由CDP逐字核验为当前dist/background.js，磁盘与内存一致。原profile仅审核，新签名使用一次性profile，不以新profile绕过原pending。

失败原始日志保留：[01](./20261005-current-extension-original-journal-audit-01.log)在worker核验阶段失败，未获得journal审核；[02](./20261005-current-extension-original-journal-audit-02.log)、[03](./20261005-current-extension-original-journal-audit-03.log)暴露审核工具GetTransaction字段掩码错误，掩码应相对于ExecutedTransaction指定digest／effects／checkpoint，不能把transaction当作响应封装层。[04](./20261005-current-extension-original-journal-audit-04.log)已核对dApp5条，staking旧worker reload期间ERR_BLOCKED_BY_CLIENT退出；没有据此记通过。后续完整05／06终态为0，7条全部通过。

## C2：明确的非执行Fullnode测试模式

生产代码已支持Fullnode独立准备；完整lifecycle原来先等待GraphQL资产成功，历史尚未与consistent下界相交时无法走到dApp。增加仅harness的RTD_TEST_DAPP_FULLNODE_ONLY=1模式：必须compiled Local、公开测试账户及modern demo；原7条终态审核必须在10分钟内且worker SHA仍匹配当前dist。禁止所有执行、dev keystore、混合资金、faucet替代、新助记词、资产及其它业务fixture；其它原资产模式仍保留GraphQL成功断言。

证据明确输出assetSnapshotAccepted=false和newExecutionAllowed=false。没有申请新资金、调用faucet或以GraphQL失败为资产通过。[5项准入守卫测试](./20261005-current-extension-fullnode-admission-tests-final.log)核对准入成功、执行／私有／资产fixture拒绝、过期／未来／错误链拒绝、pending／原记录改变拒绝及旧worker拒绝。测试是准入规则验证，实际链证据另列。

## C3：实际批准、原始BCS与正式模拟

modern demo由当前源码[重新构建](./20261005-current-extension-demo-build.log)，使用localnet与Fullnode39400。实际headless Chromium加载当前扩展，通过真实UI导入公开账户、密码设置、内容脚本和modern Kit打开批准页。

[首次实测](./20261005-current-extension-fullnode-sign-only-01.log)通过；补充实际grpc-web请求帧观察后的[最终实测](./20261005-current-extension-fullnode-sign-only-wire-01.log)也通过。返回digest为FVw4GpWL3mtd5fk3pNLE82dnEEHM4rQSXbKrGBbgdTjF；批准预览digest与返回BCS摘要相同，SDK TransactionData Intent验签成功，sender保持原公开账户。交易命令为SplitCoins／TransferObjects，未提交。

实际3次模拟分别为结构化解析（doGasSelection=true）、准备完成后正式模拟和批准后正式模拟（两者doGasSelection=false）。三次checks均ENABLED并直达审核Fullnode；后两次BCS SHA及返回BCS SHA都为0d0eca57eaefc203d5b6bc6a394a2d1782e20eb72245546de3ed94205ae41209。最终正式模拟未重新选择gas。返回GasData包含owner／price1000／budget2988000及完整payment；Validity含minEpoch3／maxEpoch4、完整H0、nonce及epoch3 proposer约束，保持在同一签名交易内。该真实样例是普通自付gas；外部赞助owner和超大Epoch范围参见之前的[直接合同测试](./20261005-final-bytes-authorization-audit.md)，不扩大为本次真实赞助执行。

整轮3模拟、0ExecuteTransaction；密码错误保持锁定、正确密码解锁、整浏览器重启后同账户先锁定再解锁通过。当前UI SHA9f390e、background SHA50b804；999项source hash重新核对为d330ab，与[最新稳定构建](./20261005-final-bytes-local-build.json)一致。运行中的8个RTD debug文件逐项与最新安装来源证明相同；本批不改RTD源码或启动新服务。

## C4：当前产物授权范围

[完整实测日志](./20261005-current-extension-authorization-matrix-01.log)同一当前产物通过8组已有场景：同／异origin与tab请求所有权、锁定批准页真实解锁、切账户取消与第二账户权限拒绝、顶层与iframe直接消息边界、切网取消与chains／events、调用前／序列化／批准窗口的6种取消、真实模拟HTTP200响应等待期间锁定取消、真实模拟等待期间调用方取消。还复测PersonalMessage Intent签名、错链及缺账户／缺交易chain拒绝、授权重载恢复、明确撤权和重载账户清空。

真实模拟等待场景仅在当前worker中暂时包装fetch，先接收实际Fullnode响应，再等待实际AbortSignal；finally恢复原fetch，不改磁盘产物。不替换模拟结果、不批准交易。整体4模拟、0ExecuteTransaction，实际worker启动及浏览器重启两次均与dist逐字相同。正常CA和自定义host权限没有本次验收证据。

## C5与完整父合同的余项

双方交易／签名章节同步本轮准确范围，Task及totalProgress按证据更新，[机器证据](../evidence/20261005-current-extension-authorization.json)与文档审核另列。完整TX-01仍要求当前产物内部币／NFT／质押／赎回的批准链路按各自业务前提复核；不能用dApp只签名一个样例宣布全入口真实批准完成。TX-10提交后切网／切账户及签名／执行等待阶段锁定保持独立待验；原终态journal没有重新发送。

[05:18:22只读历史观察](./20261005-current-extension-history-observation.json)实际连续0–34606、34607个marker，原22条watermark保持，原有界回放PID66145仍运行，无终态退出码，上界386503。紧随其后的独立status事务读到34614，两个时刻分开保存。历史仍未与consistent下界176712相交，未恢复live，未把本轮Fullnode成功称为资产或完整试用成功。
