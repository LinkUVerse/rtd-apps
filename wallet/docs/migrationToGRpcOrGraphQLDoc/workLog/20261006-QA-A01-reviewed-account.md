# QA-A01 当前审核生产候选账户进展

现已按[116项最终合同审核](./20261006-QA-A01-completion.md)完成QA-A01，65/98。下述为各轮历史增量与失败，保留原范围。正式生产候选03与产品源码1106／609dfb4e保持；每个试验使用全新未注资profile，原profile／七journal均未打开。

## 已验证

[账户第2轮](./20261006-QA-A01-reviewed-account-02.json)：50项通过。实际12词创建UI、备份显隐与确认门槛，SDK对照3个精确派生路径；真实UI通道导入独立私钥形成4账户。另一新profile用实际12词恢复UI恢复同助记词，再派生相同3路径。两profile重启均锁定，错密码解锁／导出拒绝，正确密码实际解密与SDK键逐字一致，加密账户及来源字段SHA保持。秘密只内存；88个本地链请求被阻止，资产／TLS／签名未验。[有限审计](./20261006-QA-A01-account-finite-audit-01.json)保存原脚本精确SHA。

[消息第2轮](./20261006-QA-A01-reviewed-personal-02.json)：55项和4个实际Wallet Standard PersonalMessage签名通过。普通助记词与导入账户分别选择、连接、批准，显式和省略chain两种签名均验证实际bytes与SDK公钥。两组现代方法的缺account／chain、错误链、未授权账户、拒绝及disconnect反例成立。仅受控本地demo／Fullnode身份只读接口放行；0模拟／Execute，无HTTPS／金额交易签名验收。[有限审计](./20261006-QA-A01-personal-finite-audit-01.json)与源快照保留。

## 升级发现的真实阻止项

审核候选→原生产C19→审核候选固定安装路径／ID，第2／4轮各已完成75条账户／来源检查，加密库、重启锁定、错误密码拒绝和实际解密保持；整体试验仍失败，不能勾父。升级后消息批准被后台拒绝。第4轮捕获原始公共错误“当前查询范围尚有未完成的身份或合同观察”，见[失败记录](./20261006-QA-A01-reviewed-upgrade-04.json)。失败签名数量记not-counted，不臆测零。

第2轮失败profile加密复制后诊断；原profile逐文件SHA保持，见[原样复制证明](./20261006-QA-A01-upgrade-failure-clone-01.json)。[副本worker新UI启动前只读诊断](./20261006-QA-A01-upgrade-canonical-diagnostic-02.json)见一条完整NC5 pending、无Fault；不得用新的正面响应、TTL或清库解除。第一诊断含新UI启动，可能额外产生观察，单独标明范围，不能当失败时状态。

## 后续与首次失败

按[实施前设计A7b–A7d](./20261006-QA-A01-reviewed-account-design.md)验证正常包更新的观察收尾。第5轮78检查后新页面观察阻止签名，第6轮55检查后旧包观察等待120秒失败；第7轮使用现有工具栏popup唤醒缓存worker，116项与4签通过，详见最终审核。突然终止的观察恢复和全部资金动作仍归NET-04／TX／QA-A10／QA-A20。任何收尾必须由原拥有者实际完成，只读等待绝不写入观察库。

账户01在初始UI来源阶段Error，仅记录错误类型，不归因到实际账户实现；消息01明确Chrome拒绝popup bounds；升级01／03在UI来源核验阶段失败，后续改为Debugging先于新UI导航并等待编译产物要求的全部3脚本。原结果／profile及每轮执行脚本与相关helper快照全部保留，不用新成功覆盖旧失败。
