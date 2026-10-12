# RPC-22／TX：NFT 与原生 Kiosk 执行入口迁移（部分）

日期：2026-10-03。RPC-22、TX-01／02／04–07 保持未完成；本批不新增完成勾选。

## 实现与权威对照

新增 nft-transfer-preparation：规范化 sender／recipient／object／type，保留原名称，新鲜 Fullnode 对象核对 type／owner。AddressOwner 固定 version／digest，ConsensusAddressOwner 使用 shared startVersion。Kiosk 快照只用于发现，cap／item／Kiosk 全部重新获取当前值，cap 所有人、BCS、所指 kiosk、Personal 结构和 item 包装字段派生 owner 均需一致。Shared Kiosk 使用初始版本；20秒共用预算，跨会话／取消迟到不产生批准。

普通挂牌可 take，锁定／独占挂牌不能 take；依据固定官方 Sui framework kiosk.move 和当前本地 RTD Move 源码，不能沿用旧 SDK “未挂牌”注释作更宽限制。钱包直接用现代 Transaction 构建相同 ABI：framework take／TransferObjects，Personal borrow_val／take／TransferObjects／return_val。测试实例化实际 RtdGrpcClient + KioskClient + KioskTransaction，核对两条命令图／全部输入一致，fetch 调用为零；不会为纯构建创建生产默认网络客户端或 MVR 查询。

TransferNFTForm 移除 useSigner、旧 signAndExecuteTransactionBlock、Qredo旧分支和旧 Kiosk hook 导入。页面初次恢复账户 pending，然后预览对象／地址／gas预算／digest，确认重新验证名称与同bytes模拟，交给既有 background 严格协调器。切 account／binding／readSession／object 撤销旧批准，异步结果有取消屏障；同步操作互斥阻止连点。发出 background 命令后即进入恢复检查态，响应中断也不能再次预览／发送；确认失败回执仍按原digest展示。恢复别的交易不误记当前 NFT 发送分析事件。

两套 SDK 合同同步新增6.5，保留原 archive 目录。官方当前文档 https://sdk.mystenlabs.com/kiosk/kiosk-client/kiosk-transaction/managing、https://sdk.mystenlabs.com/kiosk/from-v1；固定官方 Move 文件与SHA沿用 evidence/official/sui-nft-object-manifest.json。初次 web.open 的旧路径不可访问，之后搜索找到上述官方路径。

## 验证与证据边界

- 42文件562/562定向测试通过（此前40文件525项）。本批新增30项领域／实际SDK命令对照，7项React页面状态测试。覆盖大u64引用、共识startVersion、cap转移／变指向、错误owner／BCS尾随、普通与独占挂牌、名称／会话／摘要变化、整体取消、确认不重建、pending只恢复、响应中断、连点、切账户／会话后的迟到结果。
- 新 rpc/core 定向 TypeScript 检查通过；完整wallet检查仍失败，146条诊断（与上一批相同），不称构建成功。
- React页面测试真实渲染 TransferNFTForm + Formik，但注入账户／background／领域服务及轻量UI组件；命令对照使用真实SDK构建。两者均不是真实扩展、签名器设备、节点、合约或实链测试。此前原生Chromium harness本批未重跑。
- 输出保留在 `20261003-nft-execution-*` 日志，文件摘要／源依据在 `../evidence/20261003-nft-execution-verification.json`。本轮未启动 dev、未部署合约。

初始失败日志也保留：UI测试输入事件未绕过React value tracker，导致准备函数未触发，已改为原生value setter并要求确实调用；测试对象缺少现代json/display字段、MVR参数名称写错、NodeList需Array.from已修复；UI测试放回页面同目录，避免把整个旧钱包依赖纳入rpc专用typecheck，完整钱包仍另行检查。真实SDK命令对照发现 Result 与 NestedResult[0] 差异，已统一为真实SDK索引；修复后完整套件重新通过。

## 未完成与后续

OriginByte 旧源码保留，已不被新 NFT 表单调用；不能把其不同发现／执行包和旧 p2p ABI冒充为已证明的 RTD 合约。该分支、实际package ABI探测、真实Chrome＋debug链转出／恢复、全部账户种类、索引写后读追高及自动恢复仍待完成。其它质押／dApp／Qredo执行迁移继续进行。所有相关大任务维持未完成，试用门槛未达到。
