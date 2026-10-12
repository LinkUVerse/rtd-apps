# PersonalKiosk 独立权威、C22/C23 产品修复与原摘要验收

原98项父合同保持 **71/98、余27、trial_ready=false**。本批推进 RPC-03／RPC-22／RPC-23、TX-08 与 NFT 相关 QA 的子项；没有用单条路线代替整个父合同。保留原 C21 dist／ZIP／安装说明、原七钱包、同一 H0/generation、原合约发布与种子、指定 RTD HEAD/diff 与八个最新源码 debug。仅本批已有回环入口更新精确 CORS origin，原 HTTPS 入口保留，证书信任未改变。

## 独立部署与发现

- [连续认证导出](./20261006-personal-certified-export-01.json)：原 Axoi 发布位于201271，从原 genesis 到201271连续201272个 checkpoint，原六模块只还原 self-address 后匹配原编译字节。没有新网络、签名、模拟或广播。通用 exporter 的历史字段 compiledOriginByteMatches 在此指定 PersonalKiosk，字段未被篡改。
- [官方六源码核对](./20261006-personal-official-source-01.json)：MystenLabs/apps 固定44c0918提交；仅允许 sui/rtd 命名及 royalty SUI/RTD 对应差异。[独立五pin](./20261006-personal-certified-release-03.json)保留原三个genesis与OriginByte权威，新增原 PersonalKiosk；revision4 SHA 与声明独立绑定。当前 SDK 三个既有 BCS 文件改动明确记录，原六个 Kiosk 输入仍未变，没有把历史 SDK 空diff当成当前空diff。
- [实际部署比较](./20261006-personal-runtime-deployment-01.json)五pin运行匹配；[同一 S646269 发现](./20261006-personal-discovery-01.json)38次实际读取证明原 owner/cap/kiosk/NFT、Item nameBCS、childId/包装owner/类型/内容，与 fresh Fullnode 原引用一致。错pin／错revision负面准入拒绝，服务匹配不是部署权威。

## C22 风险名单与原执行

首轮[真实UI01整轮失败](./20261006-personal-current-ui-01.json)保留：12项及2模拟已经发生，Guardian 默认公网调用被拦截，不能改写通过。C22 修正构建策略、自动／手动查询及缓存；disabled/loading/error/ready区分，名单未核验明确显示，坏列表拒绝。新增9项真实React Query测试，[180份2534项及生产类型](./20261006-personal-guardian-verification-01.json)通过。首次缺测试库和误扫保存源快照导致的失败均保留，未增加依赖。

[C22 UI02](./20261006-personal-current-ui-02.json)14项／2次启用检查模拟／0签名／0Execute／0外部访问通过：实际私钥导入、Local、非空 PersonalKiosk、详情缺图／serial3、最终NFT/recipient/gas/expiration、返回／非法地址。独立[预览BCS审核](./20261006-personal-current-ui-audit-01.json)确认 borrow_val→take→TransferObjects→return_val 及原cap／shared Kiosk引用。

[一次真实Send Now整轮失败](./20261006-personal-current-execution-01.json)继续原样保留：实际1签名／1Execute／4启用检查模拟，但等待自动 receipt 路由60秒失败，不能记完整UI通过。原摘要 **GerYF8jrD8xwD9WqxKqSptLZVn12fZAS4YC5K8sP8oZH** 的[独立原native审核](./20261006-personal-retained-native-01.json)通过：approved/wire BCS、签名owner、原Execute完整帧与native effects一致；checkpoint969759成功，NFT为目标AddressOwner、原cap归还、kiosk item_count0。[重开同一原失败钱包的锁定审核](./20261006-personal-retained-recovery-01.json)通过，重开前即confirmed-success、之后仍终态、pending0，恢复0新签名／模拟／发送。原整轮与原首次跳转仍为失败，没有重发这笔已成功NFT。

## C23 回执等待与实际只读收据

资产快照的20秒刷新可以让 Page Loading 卸载 NFT 表单。新增页面生命周期回归在旧实现复现3失败／8通过；C23 在已开始提交的原会话保留结果／恢复表单，空恢复回到当前持有关系门禁，binding/readSession/account/NFT变更或锁定仍结束旧会话。改动不绕过 fresh owner／版本／bytes／gas／expiration 校验，也不准许未知状态再次准备。

[C23定向53／完整181份2545项及生产类型0诊断](./20261006-personal-handoff-verification-01.json)通过；首次类型命令路径错误保留。当前源码 SHA为 **7aa23d113b25dbf6d23d8c7acb2d751f173a80e00aa433cbe4a37c2b5492e481／1110文件**。[隔离production03](./20261006-personal-production-build-03.json)0error／2既有warning，不改C21 dist；[5277模块／2033源码／7JS全闭包](./20261006-personal-production-audit-03.json)通过。[实际Chrome04](./20261006-personal-chrome-identity-04.json)worker与三个UI JS逐字节一致，四角色均HTTP200／同H0，仍只是明确回环HTTP开发例外，不代表原HTTPS信任通过。

[原成功NFT的当前C23收据02](./20261006-personal-confirmed-receipt-02.json)15项通过：交易成功、同原digest、真实GraphQL覆盖低于969759且显示资产同步、空journal未被伪造、0签名／模拟／广播、原已执行钱包未打开且文件不变。这次是另行打开公共收据，不能替代原失败自动跳转或新C23 once-send实测。收据01启动整轮失败保留；02额外记录page errors／HTTP errors，实际结果单独判定。

账户历史旧503失败保留；[真实消费者窗口](./20261006-personal-account-query-window-01.json)、[native六域范围](./20261006-personal-account-native-coverage-01.json)、[配置读者 sealed head／边界checkpoint／再读范围](./20261006-personal-account-boundary-01.json)及后续Chrome四角色实际复核均通过。没有为了503重启原服务、清数据、伪造水位或改全账户完整标志；窗口仍是有限覆盖。

## 来源及剩余范围

[1141个完整相对路径输入快照](./20261006-personal-current-inputs/manifest.json)保留产品完整输入、source tests/config、三个既有SDK输入和本批部署/审计工具；原失败/旧候选/证书保持。两侧SDK矩阵同步同一[合同补充原文](./20261006-personal-contract-section.txt)。独立来源审计另写时间快照，C21已完成父项证据仍为历史，不声称当前C23所有协议/业务全重跑。

仍须验证 Native／OriginByte 实际钱包转移、直接NFT Display及hidden/undo/isolation、动态字段双向多页、全质押及名称、索引追上后的全快照、完整生命周期/故障/发布及普通HTTPS。任务范围不减少；没有新可试用ZIP，14安装说明继续标识保留的C21历史候选。全部父合同、核心试用和规定QA均成立后才能把目标标记完成。
