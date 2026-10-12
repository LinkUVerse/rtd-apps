# C118 签名回传阻塞诊断

实际UI03已失败：首coin批准后完成同byte模拟和一次原生VerifySignature，但弹窗close在90000ms超时，dApp结果／错误均空、请求approved仍null。它不是签名交付通过，UI01／02／03全部保留。

本次单请求诊断采用同一当前C109构建、同一自有网关、新的私有测试profile及正常Wallet Standard请求／Approve；以实际UI03的公开prepared为请求来源。仅观察首coin／originalWindow，不承担原12签名／39模拟合同，不勾选P118-2–4。Execute、JSON-RPC、公共远端、NFT业务保持禁止。

后台诊断用CDP读取实际加载background.js并核对完整源映射及磁盘字节，在签名处理各await边界设置只输出固定阶段名的条件断点，条件恒false、没有暂停、变量修改或响应替换。页面对原runtime port使用旁观记录，所有消息及调用原样转发；只记录prepare/sign请求与响应的id／方法／公开结果长度／公开错误，不记录密码、私钥、批准token或其他参数。此运行明确为instrumented diagnostic，不能作为未插桩正常UI验收。

先核验映射、原构建及工具变换，再fresh完整C116七门后运行。若发现产品问题，定位原因后再编码和回归，不取消原链身份、对象、审批、journal、网络pending或egress门。诊断结束关闭私有Chrome及server；自有网关只在实际继续测试期间保留，原两组链与所有非自有容器不改动。
