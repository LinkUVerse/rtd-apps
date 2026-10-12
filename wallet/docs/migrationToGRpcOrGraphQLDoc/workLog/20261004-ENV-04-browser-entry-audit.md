# 2026-10-04 ENV-04 桥接结项及三入口浏览器读取

ENV-04 按原清单范围结项：当前运行容器／配置manifest重新核验通过；桥接仅批准精确Ledger/Move方法，upstream固定mTLS native-query-ingress:8444，后者每请求经真实publication准入并覆盖可信上界。6项renderer测试通过，真实Node SDK和实际扩展页面读取证据已存在，执行路由404。证据：[运行审计](../evidence/20261004-ENV-04-audit.json)、[真实桥接](../evidence/20261004-certified-grpc-web.json)、[门禁故障恢复](../evidence/20261004-native-query-admission.json)。

本轮扩展页面同时读取Fullnode39400、TLS GraphQL39600、Archive39603。GraphQL创世digest及Fullnodeprotobuf H0加入严格断言，三者同链。现有数据面已经满足这些浏览器请求，无需另加GraphQL／Fullnode代理。证据见20261004-extension-three-endpoint-probe.json及带断言重跑的20261004-extension-permission-probe.json。TLS仍为隔离浏览器内精确叶公钥例外。

可选权限申请通过测试按钮真实click触发chrome.permissions.request，没有修改权限存储或伪造API结果；无头／可视模式均停留pending。桌面工具明确返回Mac锁定，已请主人方便时解锁。可视测试55秒等待结束后关闭本次隔离浏览器，无仍等待进程；20261004-extension-profile-preflight.json记录pending，无review，不能把文件名或exit0误认成预检成功。已调整探针：显式要求profile流程而未得到verifiedRoles时exit2，后续不得绿灯误报。

完整钱包设置表单、host permission批准、后台三入口预检／确认保存尚未通过；ENV-07不勾选。正常TLS信任、streaming／取消、其余真实核心交易仍保留对应未完成项。总体19/98。
