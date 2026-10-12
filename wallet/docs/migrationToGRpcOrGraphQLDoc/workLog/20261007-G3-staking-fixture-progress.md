# 新链质押仓位与赎回前置推进

2026-10-07，北京时间。98父任务仍84完成／14开放，trial_ready=false。本轮完成真实前置和新夹具，没有关闭TX-04／TX-08等完整父合同。

## 只读前置

[C42当前生产前置01](./20261007-C42-staking-preflight-01.json)取得43原始请求／响应帧，完整六依赖同S257718的staking-only域、一位active validator和完整epoch0单行费率；fresh Fullnode系统wrapper／inner规范BCS与indexed inner字节、epoch和active成员一致。实际六个新链受控keystore账户均无StakedRtd，发送账户余额及coin非空。没有使用旧H0仓位、注入对象或部署新合约，0模拟／签名／Execute。

## 新夹具的唯一真实批准

当前C42未注册，使用已注册保留C41 UI创建新受控收款人profile；C42完整构建差异证据证明staking／后台运行叶未变，此处不冒充当前C42浏览器验收。RTD当前源码及debug admission重新核验，真实Fullnode H0／系统inner／验证者匹配前置。

[实际UI01](./20261007-G3-staking-fixture-retained-C41-chrome-01.json)通过10检查：正常导入保护、选择新链唯一验证者、填入1 RTD、费用选择和三次完整最终ENABLED模拟，最终sender／gas owner／shared0x5／数量／验证者／链绑定Validity固定。三store最初全部为空。批准前fsync attempt，路由在转发前fsync唯一原Execute帧并禁止第二次转发。实际一次产品批准、一个签名、一次Execute，自动原摘要收据，confirmed-success／pending0；完整journal保持，正常重锁并关闭。本工具不重跑。

实际新摘要：`GYFwbYZEPNWnKzeGJgYgDYar9gZKeMZdHaiTSHSpwZFu`。真实账户：`0x32707d815917729a49dc103a1b511f297de389b19600611fcc1a5cdb8b91dcb7`。运行目录及唯一attempt／wire／response／confirmed均保留在`~/.local/state/rtd-wallet-migration/dev-20261006-03/current-G3-staking-fixture-20261007-01`，私有恢复资料未输出。原C39 pending、所有旧profile及旧交易未打开或重发。

原UI工具继承的两条check标签含“withdrawal／active stake id”，它们实际只检查当前质押Validity和所选验证者，不能作赎回／既存stake证据；本日志与独立审核按实际交易内容界定范围，原报告保留。

## 独立新鲜核验

[独立原生审核02](./20261007-G3-staking-fixture-native-audit-02.json)仅16只读原始帧，完整Execute request／response grpc-status0、四次模拟的完整帧、三份最终原bytes、canonical TransactionData／effects、唯一原签名验证、exact stake event、fresh StakedRtd完整object BCS／owner／pool／principal／activation epoch及previousTransaction成立。检查点summary／contents的typed digest、ordered contents、唯一原摘要及effects成员一致；exact gas-adjusted余额差成立。原成功journal、账户／链／generation及原effects逐项匹配，正常重锁证据成立，复查新profile无运行Chrome。

实际checkpoint **332734**，仓位 **`0x6f9d9ac3516532ac642a3f823f384976914be69e70d5b28fbf012a3d0c3b39e5`**，本金1000000000 MIST，pool与所选新链validator一致，activationEpoch1。审核01在读取原交易后因工具错误使用不存在的`profile.packages.system`失败；原失败／6只读帧保留，修正为规范系统包0x3后02通过，0新增批准、签名或执行。

## 下一阶段

[F1–F4](./20261007-G3-staking-fixture-design.md)和[C42 S1／S2](./20261007-C42-staking-lock-design.md)限定前置完成。F5／S3–S5保持开放：当前finite G4的目标283000低于新仓位T332734，必须后续认证／索引实际覆盖，再以当前C42完整共同快照读到仓位，完成真实质押／赎回表单竞争与正常lifetime。单次新质押和Node前置不能替代C42 origin、普通Chrome CA、赎回收益或98父项。

同一G4 controller PID42450／session50926继续运行；截至2910秒，HBase／SQL／Rocks最低261090／267828／267830，有限children均未退出。未重新启动控制器，原配置、source资格和保护环境保持；目标及原命令恢复尚未完成。

## 两次实际冷启动与独立补证

[cold03](./20261007-G3-staking-fixture-retained-C41-cold-03.json)8项完整通过；仅打开本轮新成功fixture，不打开原pending或旧受保护profile。两次实际保留C41完整Chrome启动、正常UI密码解锁／重锁和关闭，四份同一cipher投影与完整三store始终等于原confirmed。真实原摘要收据显示“交易成功”、“交易已确认，资产数据仍在同步。”及1／RTD分行金额。cipher取证从最初批准结束后的cold开始，不声称取证了此前cipher。

[独立cold审核02](./20261007-G3-staking-fixture-cold-independent-02.json)完整解析76原生binary request／response／末尾grpc-status0，19ServiceInfo、两genesis checkpoint、34Object、两CoinInfo、两Datatype／Function、14Package、唯一原GetTransaction；所有同H0，原交易BCS／effects／唯一签名／checkpoint332734一致，四cipher／四journal、两loaded UI／worker及ownedChrome已退出核验通过。0新增批准、签名、模拟或Execute。

失败按实际保留：cold01未等待金额加载，cold02等待但错误固定“1 RTD”空格，而实际成功内容为“1\nRTD”；03修正等待／分行布局断言，只重跑零发送的cold工具。独立cold审核01错误拒绝五字节合法空protobuf请求，实际CLI exited1且未生成原文件；已以明确`recordedBy`补存该失败记录及修改前script SHA。02修正解析后仅离线审核原76帧，没有重开Chrome或重发。

## 当前系统版本变化与后续覆盖事实

[新鲜系统后验01](./20261007-G3-staking-system-after-fixture-01.json)12只读帧：原真实质押导致系统wrapper object version2／state version2，按照当前u64 name派生的新V2 inner规范BCS／epoch／唯一validator／pool／pending_stake=1RTD一致，旧V1 field已不存在，原新stake完整BCS／digest／owner继续保持。当前C42生产V2 decoder往返实际成功。此前S257718的indexed V1前置仅是当时快照，不冒充当前原生系统；F5必须重新核对真实indexed V2／仓位。

[后续区间只读前置01](./20261007-G3-staking-interval-readiness-01.json)真实已提交publication303129，未覆盖原T332734／候选333000，0点位可授予；没有准备／认证／安装新区间。[发布阶段01](./20261007-G3-staking-publication-stage-01.json)同publisher PID7463继续：pending319967，16838条prepared rows虽已附publishedVersion，仍未提交，不能授予覆盖。原publisher／保护source未发信号，不为追赶改水位。后续认证、独立SQL／对象资格与明确恢复authority必须成立后才推进F5，名称当前高度仍是另一完整合同。

[环境后验01](./20261007-G3-staking-fixture-finite-environment-01.json)28正式容器／14healthy、22查询／两core／两publisher、原配置／finite身份保持，最低261772／268498／268502，共同窗口247964–261776。[全Docker后验01](./20261007-G3-staking-fixture-global-docker-inventory-01.json)111／97running／14exited，所有ID／image／start／health与前次相同，已退役failed-bind缺席；没有额外可确认退役容器或新清理。必要init／恢复和其他项目退出容器继续保留，0卷／镜像／数据删除。三repo diff-check及只读前置AST通过[静态01](./20261007-G3-staking-fixture-static-check-01.json)，不当作真实业务验收。

收口[三API／六循环01](./20261007-G3-staking-fixture-finite-all-account-audit-01.json)实际通过，positive token／capability分别7879／7954个自然提交，sealed SQL payload与actual public checkpoint匹配，错误H0／未来／伪造header覆盖仍拒绝；不授予全账户历史全集或完成恢复。所有新增cold／system／独立解析语法和三repo diff-check通过[最终静态02](./20261007-G3-staking-fixture-static-check-02.json)，14章节／14保留源／22QA／21RPC链接复核[文档02](./20261007-G3-staking-fixture-docs-verification-02.json)通过。98父项仍84/98、14开放、trial_ready=false。

G4最新同一进程观察3908秒：HBase267761／SQL274534／Rocks274534，三finite children尚未自然退出，目标283000／原三命令恢复和后继authority仍未完成。controller42450／session50926不停止、不重复执行。下一阶段必须等待真实终态、独立恢复及C42 edge登记，再执行当前C42收件人矩阵；新仓位332734另等真实publication／新资格及共同indexed覆盖，不能用本轮283000目标冒充。
