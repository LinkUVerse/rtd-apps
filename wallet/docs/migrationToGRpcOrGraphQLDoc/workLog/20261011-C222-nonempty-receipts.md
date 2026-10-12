# C222：真实非空收据与历史对象

六笔既有公开 dev 交易的当前服务读取完成；原失败轮和 C223 修复后的成功轮分别保留。成功轮包括 34 个由交易 effects 指定的 objectId/version/digest，逐一通过生产归档对象读取器核验。没有导入账户、读取凭据、签名或执行新交易。

普通 C51 Chrome、C221 扩展实际打开收据 `7bJ6y8hH9y94XzBAy7z58EUgo8UnTLW9pjoS9Pyp8mM2`，显示交易成功、余额变化 `-0.001024244 RTD`、网络费用 `0.001024244 RTD` 和对象变化。点击 NFT 的“查询交易时的对象版本”后，显示“历史版本已与交易记录核对一致”，版本 `269849`、digest `2qRStZdjjpAEue7QCpddShXq4JszR6SSZcTxq1141nJm`。

原生 DevTools HAR `20261011-C222-receipt-historical-01.har` 已保存。`audit-C222-receipt-har.ts` 离线使用生产 Ledger、ArchiveObject、HistoricalEffect 读取器严格匹配九次请求的 URL、方法及 protobuf 原始字节，核验实际响应、H0、裁剪后回退、交易 checkpoint `522405` 和历史版本三元组。另有一次 Provider 初始身份查询，单独计数。

该 HAR 头六条来自冷刷新前的页面，保留但不作为完整周期。冷刷新后的 66 次请求包括上述 10 gRPC 和 56 GraphQL，采集跨度约 190 秒，不能说成“单次刷新要 66 次”。完整的十轮资产准入和九轮元数据读取均经生产读取器离线重放，包含对应 H0、覆盖、固定快照和元数据读后复验。

发现的优化点：收据已确认且已被索引覆盖，仍有每轮 2 GraphQL 的完整资产/Display 准入轮询；进入收据还无条件刷新一次。另有元数据每轮 4 次实时读取。C224 已按尚未覆盖的收据观察者需求启停前者，保留后者原新鲜度语义；2828 回归、构建与普通 Chrome 的 102.351 秒实际验收通过，见 `20261011-C224-receipt-snapshot-demand.md`。首轮 GraphQL 8→6，后续停止 2 次资产准入、保留 4 次元数据校验；未设置次数上限。

浏览器曾处于最小化状态，部分 AX 点击未实际触发。通过 Chrome 窗口菜单恢复，并用 DevTools 键盘焦点停止录制及导出；最终依据实际 HAR 而非点击尝试计数。没有绕过浏览器安全或改用 CDP 执行页面逻辑。

证据：`20261011-C222-current-receipts-02.json`、`20261011-C222-receipt-historical-01.har`、`20261011-C222-receipt-historical-audit-01.json`。仅证明本笔普通浏览器公开收据/历史 NFT 对象及六笔 CLI 当前服务样本；不代表当前账户非空资产管理、全部 NFT 操作、全部页面或 98 项父任务完成。
