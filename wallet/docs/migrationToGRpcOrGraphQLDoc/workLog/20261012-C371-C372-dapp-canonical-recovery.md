# C371/C372：指定环境 dApp 真实验收与恢复修复

状态：C373 普通 Chrome 复验通过；C371/C372 失败反例完整保留。后续清理见 C375。

## 实际发现与已完成验证

用户已批准本地 `http://127.0.0.1:5181` 连接，只向该工具授权 dev 账户 `0xbad0…0456`。同一 canonical H0、指定固定中间件与归档服务继续运行，G3/G4 仍停用。

1. C370 首次消息签名成功，独立 SDK 密码学核验归属正确；页面闲置后的新请求却报 `Wallet request channel is unavailable`，刷新恢复。私有结果通道关闭后原实现不重建。C371 仅为新请求重建私有配对，不重放旧请求；配对失败仍停止发送，迟到的旧端口断开事件不能关闭新通道。
2. C371 实际在 Chrome 显示 Service Worker 无效后，从未刷新的原 dApp 页面再次签名成功。错误账户、错误链、缺失链、缺失账户均返回对应拒绝；未打开可审批的新请求。
3. C371 仅签名交易 `DQG6mYJjuLcEj5FKNdwM5UJAG7MiVt8TETKGD3yzEkMH`，浏览器 SDK 验签及发送者校验通过；原生 Ledger 明确返回 `NOT_FOUND`，未提交。待审批取消摘要 `2Q2er7sWFjaFsyFzHmn7RLBYXW2Vg7Xf2mGNKeA7tiQR` 同样链上不存在，dApp 返回取消结果。
4. C371 的 1 MIST 自转账 `EcFwVYnaPZoAUkW3SZLrHsifgWLZwjNuPDBzxDkH7fzv` 在 checkpoint 6632 成功。但批准后刷新早于后台日志写入，首次空日志结果导致预览准备失败；再次刷新又触发“dApp结果授权不存在或已使用”。这是**链上执行成功、结果交付失败**，不可记为恢复验收通过。确认原生结果后关闭该请求，保留原交易及失败证据，没有重发该摘要。

## C372 修复

- 空日志不再视为永久无执行：审批页继续每 3 秒查询本地日志，发现后来写入的原记录后进入恢复，不重新准备已存在的交易。空日志分支不调用链上 RPC，正常预览组件不会因该检查重建。
- 恢复结果沿用执行者在签名前捕获的原始 dApp grant，不获取新授权上下文。最终交付仍检查原来源、账户、网络、站点授权及撤销状态。
- 对相同原结果允许恢复查询重复核对；任何不同 bytes、签名、effects 或摘要均拒绝替换。消息签名的 grant 不能用于执行恢复，已断开的原请求不能重新获得结果授权。
- 237 项针对性回归、TypeScript 检查通过；构建、安装及浏览器重现复验继续。

## 证据边界

原始证据放在私有 `canonical-stack-20261012/evidence`：`dapp-message-native-verify.json`、`C371-sign-only.json`、`C371-cancelled-execution.json`、`C371-browser-observations.json`、`C371-dapp-native.json`、`C371-focused-tests.log`、`C372-focused-tests.log`。源码、文档及文字日志可以提交；签名响应、截图和原始验收数据不提交。

完成本轮实际恢复与最后核验后，撤销工具连接、停止临时工具，再清理已列明的旧 RTD/wallet 容器及临时镜像；保留其他项目和全部数据卷。

## C372 真实复验与 C373 时限修复（2026-10-13）

C372 的 `GFhS5Qyp8uNbNNFjNYQ3y78bGs9ZBAyApvdwhKYSodHF` 在 checkpoint 6908 成功，归档核对 2 个历史对象通过。批准后立即刷新已自动显示同一原摘要“原交易已确认”，但点击返回结果仍报网络准入合同错误，因此没有记为完整恢复通过。

定位到结果出口沿用了签名前捕获的 30 秒动作期限。新增状态机测试复现到期拒绝。C373 将已确认执行结果的交付期限独立为签发后 10 秒：只有原 lease 的 sign 和 dispatch 都实际进入受保护动作回调、后台已核验并封存执行回执时才可使用；不刷新原 epoch/revision，不扩展签名/提交期限，不重新获取授权。签名结果、消息结果、未提交请求不能借用该出口。一次性消费、原文档/账户/站点绑定、撤权、负面准入和交付前复核保持。

新增 20 项 IndexedDB 状态机测试；共 257 项针对性回归及钱包 TypeScript 检查通过。模拟数据库测试不代替 Chrome 原生恢复验收。依赖仅新增固定版本开发测试包；同时排除文档目录中的历史源码快照进入 pnpm workspace，锁文件只保留该测试依赖变化。生产构建和超过 30 秒的浏览器恢复复验继续。

## C373 最终真实结果

生产构建与依赖闭包审核通过，C51 原路径升级保留账户、扩展 ID 与 C372 完整备份。批准 1 MIST 自转账后立即重载审批 UI，自动找回原交易；批准到点击返回耗时 53,645 ms，超过原 30 秒动作期限，dApp 实收同一摘要成功结果。摘要为 `67PJDWwFWX3TYeGpShCspquZn5vh8mq2MWa5dJuoh5XN`，checkpoint 7472。另一次正常不刷新执行 `64iDvUUnF9zvRZqZPXgWcsJopUTU56qTqXWdCWcj36wM`，checkpoint 7712，同样正常交付。两笔均经原生 Ledger 复核，分别 2 个历史对象由归档精确核对。

本次恢复的准确范围是审批 UI 重载、原后台 claim 仍存活；不将这次证据声称为后台进程崩溃恢复。原有完整生命周期证据仍保留其自身范围。首次归档查询处于发布追赶窗口而 NOT_FOUND，追赶后通过；所有失败日志保留，不抹掉索引延迟。

dApp 已 Disconnect，钱包内也已撤销该站点的持久授权，随后停止仅用于验收的 5181 服务。普通 Chrome 活动页显示完整 19 条记录、两笔新摘要；恢复回执显示交易成功，历史对象显示“历史版本已与交易记录核对一致”。最终返回首页，998.88 RTD、123.45 WMIG 正常显示。

私有证据：`C373-browser-recovery.json`、`C373-dapp-native.json`、`C373-dapp-archive-02.json`、`C373-dapp-normal-native.json`、`C373-dapp-normal-archive-02.json`。14 笔本轮 Chrome 链上执行中，原 10 笔及新 2 笔端到端成功，C371/C372 两笔是交付失败反例；55 项历史对象全部完成独立核对，不能把失败交付算成通过。
