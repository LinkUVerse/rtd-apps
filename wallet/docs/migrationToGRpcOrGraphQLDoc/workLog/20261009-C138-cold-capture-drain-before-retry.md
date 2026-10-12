# C138冷守卫只读复验前采集时序修复

冷01已实际完成Coin/质押/赎回/dApp四路durable拒绝、原生锁空闲下trusted prepare拒绝、normalUnlock/Reject/Disconnect/relock、journal/cipher保持和零critical请求；216帧/14固定digest恢复。整轮在最后采集检查拒绝：一个非空account-history-coverage响应正文缺失，另有既定固定digest/确切recipient NotFound；原因未知。失败原件保留，不以批准creator重跑。

只修改测试采集工具：响应先等待finished，再调用body；跟踪真实HTTP request开始/完成/失败，在普通导航、popup路由变化及normalRelock前等待已有请求/采集作业排空。仍不构造空正文、响应或产品函数、不新增缺口例外、不降低旧固定digest/recipient规则，不修改journal。新冷02用同真实5nano pending与同profile，只读恢复，0新sim/Verify/sign/Execute。旧creator、原C133 profile及所有已批准摘要不重跑。若仍缺非空正文，整轮保持失败。

API依据：[Playwright Response.finished](https://playwright.dev/docs/api/class-response#response-finished) 等待响应完成。首次失败不用于宣布完整流量/teardown/M5通过。新源须整源逆变换独立后，fresh七门通过才启动复验。
