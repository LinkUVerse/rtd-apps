# C164 首轮连接超时与正常控制补齐

首轮完成27项实际有效期UI后，personal/originalWindow 的正常Connect账户恢复在测试工具默认5秒内未完成；未发送本次批准请求，三个私有入口0调用、原captureErrors/cleanupFailures均空，正常浏览器关闭。原failed01保留，不计完整54。

新测试helper将正常Connect/Disconnect账户恢复等待改为60秒，并在每项前检查既有钱包正常锁定状态；若锁定，只通过正常解锁按钮/密码对话框解锁，记录实际次数。密码不写入报告，原journal/密文保持检查继续；不写权限、token或持久状态、不禁用自动锁定。所有54种请求/按钮/摘要/源字节/BCS/实际原生错误及正常Reject仍完整保留。失败时保存脱敏页面诊断，区分迟到连接、锁定或授权问题。

新v3 actor使用v2 helper、新独立空profile，不重开原profile；所有请求依然仅unsigned预览并拒绝，0旧批准/旧Execute重播。必须完整实测与独立审核通过后才能计入TX-01。
