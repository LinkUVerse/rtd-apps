# RPC-01／02／03／22／23：NFT 查询页面与收件人检查

日期：2026-10-03（北京时间）。本次对应上述任务的编码子步骤及 NET-12 验证边界；所有完整任务仍未勾选。与 archive 原目录的 SDK 合同已同步，原目录和冻结原文保留。

## 变更与依据

- 统一新 WalletAssetObject：NFT 列表／隐藏／非视觉、媒体／视频、详情和转移入口的读取、Buy-N-Large、framework／PersonalKiosk 卡片及详情页移除旧对象 DTO／查询 Hook。全集合准入后分类，隐藏对象不泄漏或重复，批量 Error 保留位置／ID并显示失败；失效／查询错误不冒充空资产、空 Kiosk。特色配置类型规范化，不另查一页 getOwnedObjects。无 objectId 不永久 loading。
- 新 core kiosk-hooks 注入 WalletAssetSnapshot.nativeKiosks；既有原生 reader 整组共用20秒总取消预算。账户持有支持 AddressOwner／ConsensusAddressOwner；ObjectOwner 只接受同 S 已证明的 cap／child/wrapper 关系，并比较独立点查和 Kiosk 内容的版本／摘要／类型／owner／BCS。不在支持范围明确显示未证明，OriginByte 不静默当成空列表或既有支持。
- 新 Fullnode 当前对象 reader 使用真实 LedgerService.GetObject binary gRPC-Web，省略 version、不回退历史归档，前后 H0／水位核验，10秒总预算。完整对象 BCS canonical 重编码、Object::摘要、UID／引用／owner／类型／内容／previous_transaction 一致；package 也是对象。只有真正 NOT_FOUND 且末验通过返回 null；成功缺数据与其它错误不表示不存在。BCS 限1 MiB，Party／当前 SDK 未支持的优化 accumulator 布局明确失败，不冒充不存在。
- AddressInput 改为只读当前对象 + 独立 accountHistory 的支持窗口，绑定 profile／readSession／规范化地址，禁持久化、无自动重试、20秒总预算。中英文提示保留未知与有限覆盖，窗口无活动、有活动、格式通过均不声称收款安全；取消／错绑定不交付结果。清空操作使用实际字段 name。
- 新 04/原 archive03 的6.4合同同步，修正6.2/6.3小节顺序。固定官方 Object、原生协议与 Kiosk Move 源码已下载并保存 SHA；has_public_transfer 已过时，只能作为保守显示提示，实际执行依赖类型能力、新鲜 Fullnode 输入与最终模拟。PersonalKiosk包装不是普通可转移NFT；当前图形快照不是签名授权。

## 验证与保存输出

最终定向命令：`pnpm exec vitest run src/shared/rpc src/background/execution.test.ts src/background/accounts/zklogin/current-epoch.test.ts src/ui/app/hooks/useGetAllCoins.test.ts src/ui/app/i18n/index.test.ts src/ui/app/background-client/index.test.ts`。**525/525、40文件通过**，本批新增55项（当前对象37、NFT／Kiosk Hook8、收件人10）。实际 SDK binary protobuf／gRPC trailers、固定 RTD/Sui SDL 以及真实 React Provider/Hook 被执行；这些不是运行链或扩展 UI。

`pnpm exec tsc -p configs/ts/tsconfig.rpc.json --pretty false` exit0；`pnpm exec tsc -p tsconfig.json --pretty false` **exit2，146条诊断**（前158、初始276），本批35个直接代码文件无诊断。Prettier35文件通过，git diff --check通过。文档完整性13章／14原文／21线协议／22QA通过；AST637文件／43个生产方法名候选／3个wire字面量，该库存含原生同名方法和其它产品，不能作为无JSON-RPC发布证明。

使用当前源码已编译 debug 的 rtd_types／bcs库在临时目录编译并运行独立 Rust proof，源文件和库哈希已保存，临时二进制清理；8组原生 Address/Object/Shared/Immutable/Consensus owner及Gas/Coin/StakedRtd对象，与TypeScript逐组核对BCS和摘要。没有修改 rtd源码、启动 dev、部署合约或调用旧 release产物。

证据：`evidence/20261003-nft-recipient-verification.json`、`evidence/20261003-fresh-object-rust-proof.json`／vectors.jsonl／rs.txt、`evidence/official/sui-nft-object-manifest.json`、`evidence/20261003-after-nft-json-rpc-inventory.json`。最终输出是 `20261003-nft-final-{suite,rpc-typecheck,wallet-typecheck}.log`。初始失败输出全部保留：测试标签 %j不能序列化bigint、测试预期URL缺分隔斜线、React act在拒绝时未完整收束、测试helper自动改写触发return换行ASI、Rust短RtdAddress解析和test fixture类型，均已修复；失败不能被计为通过。

## 保留的未完成范围

NFT转移／Kiosk执行仍有旧Signer／SDK入口，OriginByte实际RTD部署／发现／执行ABI、共享core旧消费者、历史对象版本／checkpoint、隐藏偏好持久化作用域升级、其它RPC／签名入口、完整Webpack／Chrome／同链验证与试用包均未完成；不勾RPC-01/02/03/22/23或NET-12。原生Chromium12项journal既有证据未在本批重跑，不声称新增Chrome验收。总体仍13/98=13.3%，当前不可试用；继续按Task完成剩余接口和核心链路。
