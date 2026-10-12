# C39 NFT原操作与自身读取保护

C38真实新目标尝试01已经结束为失败，0 Execute，原profile与attempt保持。222份只读渲染采样看到同一session中initializing/hasFullnodeSession=false，再恢复true；原hasFullnodeSession是读取门禁视图，不是物理session销毁信号。不能将C38编码通过冒作实链修复完成，也不能重发两个C37已经成功的NFT。

- [x] F1：自身读取保护期间原revalidate、原派发结果不被取消或重复恢复；被保护隐藏的数据不能当作已证明不持有，准备表单保持；先记录旧实现失败。
- [x] F2：以外层binding/account/readSession key拥有生命周期，普通资产guard只控制新读取/批准；初始恢复等待可用读入口且不能与原操作竞争。明确ownership错误/锁定/真实scope变化继续退役。
- [x] F3：定向/全量/两类型/新production及闭包，原C38 artifact/失败留存，配对技术文档共同修正hasFullnodeSession的语义。
- [x] F4：实际Origin/严格edge后，用尚未广播的serial2原有夹具重新完整预览新批准，单击一次验证new-target转移、原native签名/effects/新Kiosk与OwnerToken/自动收据/journal及索引状态。原未签名C38批准不复用，不补写失败成功。

before01实际33通过/3失败；after01通过原问题，after02加入StrictMode原只读恢复共享与负面门禁禁用新批准，实际123通过。全量2632及两类型exit0；当前完整production终态与实际单次转移另验。C38的222份只读采样保留：同一实际session下guard状态false，随后form移除/恢复，0 Execute。不能归因native拒绝或链失败，也不把采样当新版本成功。

F3独立production与完整闭包实际通过，当前1118文件SHA 129b3e5873712087ce12d17c686e105cfcdf2d9621626570b0e1891ed79d69bd，123定向/2632全量/两类型通过；配对wallet06/archive05的C39当前合同相同，三项目diff --check通过。实际新包Origin pecppogdmgcanbljfjbjklpnnonmfege，五权限contained、未知41999false、注册前403。原C38产物与失败保持，注册和F4另验。

2026-10-07 F4限定终态完成：[严格入口独立审核](./20261007-positive-C39-edge-audit-01.json)54门禁／八H0／三TLS通过；[真实UI执行](./20261007-positive-C39-ob-create-execution-chrome-01.json)13检查、原批准一次、唯一Execute、自动收据路由、confirmed-success／pending0／完整relock保持。[独立native审核](./20261007-positive-C39-ob-create-native-audit-01.json)原摘要5Bbqec71YwUZuc7MnzBdEKaNJWuALvkRrSuwYCXXqb9k、checkpoint176999，原批准BCS／签名／原Execute响应／effects逐项匹配，source Kiosk清空、新target Kiosk及OwnerToken创建、目标包装字段与NFT ObjectOwner精确匹配。原运行器receiptText取样过早仅为页面壳，不据此断言状态文本；[独立只读收据Chrome](./20261007-positive-C39-ob-create-receipt-chrome-01.json)15检查实际成功文本与索引同步提示、真实GraphQL低于176999、原执行profile文件不变，0新签名／模拟／执行。索引追平与全入口父合同仍按TX-08／QA-A14另验，不扩大F4范围。
