# 审核候选资金签名实施前设计

65/98。QA-A01账户合同完成后，开始当前审核生产候选的资金交易签名增量，不借用C18历史签名。候选03／独立发布registry／现有8 debug来源保持。

- S1：只用全新独立profile随机助记词和随机导入账户；秘密只内存。先验证当前H0及genesis0，再由现有dev V2 Faucet各注资一次；每笔Faucet请求前落盘公开recipient及attempt，保留未知结果，禁止同fixture重复请求。
- S2：正常Chrome CA设置，不导入、不绕过证书。HTTPS继续阻止且不作接受结论。只放行本任务本地demo及列举的Fullnode原生只读／模拟／签名验证方法，Execute始终拒绝；Node注资与钱包广播分开计数。
- S3：创建／备份／派生／密码检查沿用实际UI流程，每次正常退出前保持查询页面活跃直到所属观察实际收尾。使用产品现有popup唤醒worker，不修改编译产品或观察库。
- S4：普通助记词及导入账户分别Wallet Standard connect，真实sign-only批准；独立SDK验证实际签名字节、预览digest、sender／gas／expiration，准备和批准两次正式模拟必须同一bytes。每组消息及错误chain／account／拒绝／disconnect仍验证，禁止sign-and-execute。
- S5：保存实际UI／后台SHA、原始模拟metadata、公开资金proof、Chrome／profile身份与源SHA；失败保留新profile及attempt，不重试或清journal。至少2次Faucet注资、2个交易签名、4个消息签名分别统计。

本轮只推进TX-01／QA-A08／09／TRY-02的当前候选签名基准；完整资金执行、失败回执、赞助边界、资产页面、正常HTTPS及全部任务须继续逐项验收。

## 首轮裁剪与下一轮调整

首轮在资金身份检查时Fullnode的checkpoint0返回NotFound，注资／钱包模拟／Execute均未开始；原结果、源码和新profile保留。下一轮仅在原生NOT_FOUND时改由既有同链archive读取genesis0，并同时核对archive／Fullnode服务chainId；其他错误直接失败。Node验证使用进程私有NODE_EXTRA_CA_CERTS指向开发公开CA，不改变浏览器／系统信任；普通Chrome仍无HTTPS接受结论。记录实际服务worker网络事件需在Playwright加载前启用其明确的实验网络事件开关，保留所有实际模拟字节hash。
