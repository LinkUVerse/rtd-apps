# C118 非NFT实际签名推进记录

执行顺序保持：全部非NFT功能验收完成后再做NFT；原98与细分权重不变。当前C1091122产品、原核心524022／300秒fresh、C116显式单RegionServer运行视图和完整原scope保持。本批签名合同见[编码前方案](./20261008-C118-non-nft-sign-only-design.md)。

## 已完成工具资格

六份完整原工具全源逆变换、12正向完整非NFT请求、六笔实际历史钱包签名／原生VerifySignature帧与18密码学／请求变异拒绝通过。另三份只读诊断修正及三份结果等待修正分别全源可逆；原六项资格在02／03重新通过。所有原工具、产品构建、源及失败不修改；资格不计当前签名验收。

## 实际失败与限定实证

- [实际UI01](./20261008-C118-non-nft-signing-ui-01.json)：三内部11前段检查／15模拟后，首个coin正常预览等待90秒超时；没有返回签名，Execute为0。该阶段85 GraphQL响应没有协议errors、没有dApp原生模拟；根因未确认，不能称已修复。
- [只读诊断版UI02](./20261008-C118-non-nft-signing-ui-02.json)：首个coin预览及批准后的最终模拟均实际完成，并发出一次原生VerifySignature；驱动对dApp结果使用默认5000ms，实际等待超时，未确认交付。闭合的弹窗没有可读诊断；该失败保留。
- [独立只读签名诊断02](./20261008-C118-first-native-signature-readonly-diagnostic-02.json)：从实际原生请求提取公开签名，完整TransactionData、同byte两次模拟／effects／objects、原生isValid、独立TransactionData intent密码学验签和当前已加载UI／worker字节核对通过。接受一笔已生成并由原生验证的签名，`actualDappReturnedSignatures=0`、`dappDeliveryAccepted=false`；不是正常签名UI验收。首次诊断误用失败proof未提供的顶层owner、实际失败01保留，02由原C43owner、实际密文owner和三路prepared.sender共同核对。
- v3将正面结果等待显式恢复为原计划90000ms，并记录实际dApp错误／结果，即使弹窗已关闭也保留。[UI03](./20261008-C118-non-nft-signing-ui-03.json)已实际失败：首coin批准后完整同byte两次模拟、一次原生VerifySignature与后续链身份查询返回，授权弹窗仍提交中，close等待90000ms超时；dApp结果／错误均空、请求approved仍null、返回签名0／Execute0。5秒等待问题没有解释这次失败，根因未确认，不标为修复。
- 接续[单请求诊断方案](./20261008-C118-signature-delivery-diagnostic-design.md)及[两工具完整源逆变换／12源映射位置资格](./20261008-C118-signature-delivery-diagnostic-source-prepared-04.json)，只观察当前首coin的真实后台阶段和UI port消息；instrumented diagnostic不算原12正常签名验收。原产品1122及审批、journal、链身份、网络pending、egress门保持。

## 当前发布者观察

[15:30只读账本观察](./20261008-C118-publisher-current-child-ledger-observation-01.json)确认旧84209子进程不在列表，80964父进程仍working且没有当前直属child；正式553728／pending709569，145454条完整连续prepared至699182，锁0、epoch1／admission true／state active。该观察没有确定退出原因，不把child缺失或锁0当安全终态；`qualifiedNaturalTerminalAccepted=false`、`handoffAccepted=false`。没有向父子或两组链发送信号，候选四线程仍未安装。

当前非NFT一期、全部最终授权／赞助／执行／M5、普通Chrome、名称757805、完整物理WAL冷恢复、全流量及九原父仍开放。NFT业务0；本轮独立网关仅cbca一份，在继续实际测试期间保留，完成或退出本批后按确切CID正常清理。P118-2–4不勾选，原89/98、剩余9.18%、trial_ready=false保持。

接续更新：单请求诊断06已在后台正常返回签名后，由dApp发布阶段拒绝；独立审核确认原租约至少40317.6ms，超过30000ms。完整实证和C119降耗候选见[失败定位及候选实证](./20261008-C118-C119-signature-latency-findings.md)。cbca已按确切CID正常stop20秒／exit0／rm清理，后续安装准备保留原配置文件，不保留闲置容器。候选未安装，原90秒正常签名及完整业务未接受。

C125当前C124来源合法演进后，原完整正常39模拟/12签名/12验签/84变异实际及独立通过，三自有query正常清理和完整source/scope/fine/98审核通过。原所有失败及单请求诊断范围保留；此结果不替代其余NFT、赞助/M5、普通Chrome或完整一期。
