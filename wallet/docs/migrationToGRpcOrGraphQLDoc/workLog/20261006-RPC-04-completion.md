# RPC-04 完成：当前 coin 发送页面、两个 Max 与两笔单次真实执行

当前C21产品源码仍为f867a8d4d44ff1c7b578c7e041b488fd2759b569d4553f651f18b9edbada4715／1108文件，使用revision3独立回环候选。原HTTPS、CA、七个原浏览器目录和原dev链保持；最新RTD HEAD／diff及八个debug产物在两次真实执行前逐字核验。没有改业务源码、重新编译已有服务或重复旧交易。

## 金额、metadata、Fullnode及当前页面

[真实共同S metadata](./20261006-RPC-04-loopback-token-read-01.json)在S631948核验WMIG完整名称、symbol、6 decimals，原snapshot余额为500000 Coin和0地址资金；RTD496500976为纯地址余额。[独立Fullnode完整扫描](./20261006-RPC-04-current-funds-01.json)逐类读取前后余额并核对Coin引用、owner、type、无重复、sum及coin/address总额。该时间点读法不声称并发资金全局原子性、强制100对象跨页或当前GraphQL已追到本次执行后的tip。

[当前真实Chrome04](./20261006-RPC-04-current-ui-04.json)通过18项检查：私钥导入与密码保护实际页面、精确账户／local／当前worker及三个UI JS，列表0.5 WMIG与实际缩写名称、0.1非原生、0.5非原生Max、原生Max、有效期与gas、返回不批准。零、超过6 decimals、超过余额、非法收款地址均实际禁用检查。7条模拟请求仅6条完整原帧被捕获，另一条未收集完整响应；不把它算作第七个完整模拟。

[独立模拟审核05](./20261006-RPC-04-current-ui-audit-05.json)从原gRPC-Web二进制帧重解码，不发网络请求。三个最终BCS摘要与UI相同，checks=ENABLED；WMIG收款100000／500000，gas仅由RTD承担。原生Max收款494512976，净gas1988000，总数496500976精确守恒；GasCoin一次转移及完整reservation引用与当前SDK源码的owner／全H0／epoch／地址余额派生完全一致。SDK辅助函数只用于独立测试审核，生产仍使用已构建SDK解析及原生Fullnode gas选择。

## 两笔当前实际发送与原摘要审核

两次均新自有profile、原受控账户、独占fsync attempt与runtime内0600恢复材料，只点击一次Send Now；第一次检查14条既有pending／原摘要，第二次检查15条并包括第一次已成功摘要，没有打开原profile。两次批准不同目的与不同币种，不是重发同一失败交易。

| 当前真实发送 | 摘要 | 当前Chrome | 模拟／签名／广播 |
| --- | --- | --- | --- |
| 1原子RTD | EQLJkzSGf4UpqvzAPeCuVwN2RE125Ve2up41FbNp2PLd | [实际01](./20261006-RPC-04-current-execution-01.json)／[独立审核02](./20261006-RPC-04-current-execution-audit-02.json) | 4／1／1 |
| 100000原子WMIG（0.1） | DZRmxMSfqRaJrhuCreraGDAVsGpk7fTRcnaHnhWsdg7i | [实际01](./20261006-RPC-04-current-token-execution-01.json)／[独立审核01](./20261006-RPC-04-current-token-execution-audit-01.json) | 4／1／1 |

两次各9项当前Chrome检查、confirmed-success唯一strict journal、空pending和实际receipt路由通过。独立审核按原digest从Ledger重新取回完整交易BCS／签名／effects／balanceChanges：批准BCS逐字相同、签名与原Execute请求逐字相同且Ed25519验出原sender、effects与原wallet receipt DTO相同、收款金额分别1和100000。独立审核均0模拟／0签名／0广播。

RTD Ledger checkpoint960704；广播当时wallet receipt checkpoint=null合法，不写成当时已知checkpoint。RTD原Execute二进制响应体未捕获，但完整wallet receipt DTO及原请求已经保存并与独立Ledger核验。WMIG另保存原Execute完整二进制回包，grpc-status:0 trailer及原native摘要均独立核验；不把两者的运输层留存范围混写。新的原摘要只能恢复，禁止重跑执行脚本以再次发送。

## 源、失败与原合同收口

[十个完整编译模块审核](./20261006-RPC-04-current-lineage-01.json)将旧C18实际JS与当前C21开发JS按原记录SHA绑定，逐字比较coin metadata、Fullnode、两种funding、coin preparation和整个发送页面的10个完整module，保留CRLF。当前生产候选与开发版同C21产品源码；变化的交易／后台准入路径不靠继承宣称通过，使用以上两笔当前真实执行。原Oct4混合资金部署／准备／钱包实际执行证据维持原日期，不冒称当时全harness成功或重新作为C21运行；其原失败和独立只读恢复均保留。

当前产品之前已通过179文件2525项、完整prod类型；本批源码未变，核验原日志及source绑定，没有重跑或新宣称一次全量。40份完整相对路径[源快照](./20261006-RPC-04-current-inputs/manifest.json)覆盖所有本批harness／audit／核心coin实现及测试辅助SDK来源，无秘密。UI01币名缩写定位、02金额后缀、03有效期断言失败原目录／原文保持；模拟审核01漏trailer、02把原生reservation误当空payment、04已安装SDK不含辅助函数、综合审核01相对日志路径错误均原样留存，新版本独立通过。

[父合同综合审核](./20261006-RPC-04-completion-audit-03.json)核验原RPC-04完整编码／Fullnode扫描gas／snapshot详情职责、当前全部coin表单和Max、两笔实际执行与独立BCS签名effects、原混合资金历史、源／测试／失败及98项边界。Task标记后另生成04，原03的70/98时点保持。RPC-04完成后71/98（72.4%），余27、trial_ready=false。QA-A05大规模多币、QA-A08完整gas再授权和错误交易矩阵、全部TX、NFT、网络归零、原HTTPS与发布门槛继续按原合同推进。

二进制回包trailer审核依据[gRPC官方Web协议](https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-WEB.md)：响应data与末尾trailer为分开的帧，逐帧验证长度／标志和状态。这个审核器兼容修复没有修改生产传输器。
