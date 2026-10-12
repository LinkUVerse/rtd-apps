# NFT 后台快照刷新期间保留收件人草稿

RPC-23／TX-01 增量修复，父合同保持开放。C41 Chrome 03 实际输入消失再变为空，链绑定／readSession／form key保持，资产快照key变化；[独立诊断](./20261007-C41-nft-draft-reset-independent-01.json)核验当前1119源码、产物、关闭profile及实际时间序列。当前C41产物保留，G4原28容器与运行中的消费者不动。

- [x] D1：真实当前UI和独立观察确认草稿丢失，不将失败归因于收款历史服务或发送人地址。
- [x] D2：独立回归用例实际8项，loading／fenced／initializing三项失败；明确错误、丢失所有权、锁定、账户或读取会话变化五项通过。01／02启动配置失败为0项，03 JSONC配置启动失败，04才是有效测试。
- [x] D3：仅保留同对象／账户／链会话内上次已准入类型以保持草稿渲染；重新检查期间明确ownershipReady=false，准备与批准禁用。确定否定和authority变化仍撤销，首次未准入不能授予表单。
- [x] D4：相关NFT会话／准备守卫回归，单独新生产产物完整构建与独立bundle审核；原C41字节不替换，不混用其证明。
- [x] D5：新构建真实Chrome补完收件人矩阵和刷新草稿、重新准入／撤销；独立原帧、journal不变、正常重锁。G4恢复前不变更受保护容器，新origin后续显式注册。

保留草稿不能授予历史所有权、最终Fullnode输入或发送授权。原C39严格pending及其profile不打开，不重发任何原摘要，不增加模拟／签名／发送来诊断草稿。


D3/D4实际完成：[8项草稿](./20261007-NFT-draft-retention-tests-after-01.json)与[41项会话/持有/准备](./20261007-NFT-draft-session-tests-after-02.json)通过，含重新所有权准入前禁止准备、重验和执行。[C42生产构建](./20261007-default-generation-positive-C42-build-01.json)无编译错误，2条warning保留；[完整bundle](./20261007-default-generation-positive-C42-audit-01.json)5285模块、2036源、7chunks旧wire检查通过。[独立差异](./20261007-C42-draft-delta-audit-01.json)1119源还原C41原hash，四源修改、仅两个运行叶；index.test原文明确由精确反向编辑重建。C41旧产物和开发dist字节保留。

[C42实际origin探测](./20261007-positive-C42-origin-probe-01.json)当前UI、worker和五精确权限通过，陌生端口权限false，真实查询403关闭式拒绝；新origin为chrome-extension://inejiinamojodncefjohnjceedcpbgfg，尚未注册，networkIdentityAccepted=false。[注册工具](../../../../link-u-smart-contract/all-in-one-deploy/localDeploy/register_wallet_positive_c42_edge.py)仅准备，必须G4成功终态、精确原命令恢复及新authority成立后才替换唯一自有edge，完整十旧origin保留。当前G4消费者和28容器不变。

[新C42矩阵工具](../../scripts/test-current-C42-recipient-risk.cjs)仅通过语法检查，未执行；正面history期间要求观察至少两个assetSnapshotKey、同readSession且输入无消失或清空。原C41三轮失败保持，84/98，trial_ready=false。

D5实际[当前C42 Chrome](./20261007-positive-C42-recipient-risk-chrome-01.json)16项和[独立03](./20261007-positive-C42-recipient-risk-independent-03.json)通过：五提示、两个真实assetSnapshotKey（同一S283000，非两个高度）、固定会话/key和输入保留、三journal为空及正常重锁。42成功RPC原帧、8账户原帧核验，初始archive503与三原负对象body采集错误保留；补充新鲜原生三missing5/四历史交易/typed检查点不替换原缺失报文。01审核遗漏Package分支、02遗漏headers-only错误响应均保持失败且0发送。完整RPC-23及实际所有权撤销后的交易批准不据此完成。
