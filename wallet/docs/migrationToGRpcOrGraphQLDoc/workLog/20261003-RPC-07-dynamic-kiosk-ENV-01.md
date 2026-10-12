# RPC-07 完成；动态字段／Kiosk 与 ENV 实施日志

日期：2026-10-03。依据：04／06／08／12／13；本批只勾选 RPC-07、ENV-01。读链／浏览器／全钱包构建未通过，不能据此发布试用包。

## 代码与职责

- Provider 准入一个共同 GraphQL 资产快照，余额／元数据／拥有对象／点查共用同 S 与 proof。每次准入增加独立 nonce，即使 S 相同也刷新领域查询；失去准入后取消旧会话可达数据。周期刷新集中在 Provider，领域 Hook 不自行选择不同快照。
- 新增 shared core 的原生资产 Hook 与模型，不创建旧 RtdObjectResponse／content.fields facade。支持全量 owned objects 上的本地复杂类型过滤、保留逐项 Error 的对象批量结果，缓存绑定 profile／会话／快照，禁止持久化和跨会话 placeholder。
- 钱包全部直接 useCoinMetadata／useFormatCoin／formatBalance／CoinFormat 消费者迁入新模块；两处美元估值也接入新元数据。无 native RTD=9 的硬编码捷径，品牌覆盖不能改变 decimals。其它应用仍用旧 core 模块，钱包剩余旧 Kit／barrel／业务请求继续由 NET-08／NET-10／RPC-26 清理，不能说整个 shared core 的旧 JSON-RPC 已清零。
- metadata 明确 null 与异常分别保留。显示缺元数据仅显示原子单位，错误显示未知；金额字符串／bigint 精确换算，拒绝不安全 Number、非整数原子金额和无效 decimals。转账构建／预览、质押构建、USDC 预设金额不再把未知 decimals 当 0；真实 decimals=0 可构建。发送选币与签名执行仍在 RPC-04／TX，当前不可试用。
- NFT metadata 点查已接入新对象和 Display v2，结构化 output 和字段渲染错误不作为文本／URL。NFT 列表、隐藏资产、所有权和 Kiosk 页面尚未整体接入，RPC-01／02／03／23 不勾选。
- 原生 dynamicFields 全分页和 dynamicField／dynamicObjectField 独立点查，保留 primitive／vector／struct name BCS，核验派生包装 ID 与子对象 ID、异常／部分成功、游标／预算和终页 proof。RPC-08 待页面／其它消费者接入，不勾选。
- framework／PersonalKiosk reader 全分页读取 caps／Item／Listing／Lock，精确 BCS 重编码拒绝尾字节，逐项核验 UID、对象数、子对象 type／content／owner 和完整批量位置。尚未注入钱包全部 Kiosk 页面，也不宣称覆盖 OriginByte／交易分支；RPC-22 不勾选。

## 权威裁决

已查 Sui 官方动态字段和新客户端查询／Kiosk 文档，核对当前 rtd 的 dynamic_object_field.move／kiosk.move 与已检出 SDK 的生成 BCS 布局。源码 add_impl 把 child 加在 Wrapper 字段 UID 下，因此 owner 比较派生 field ID；直接比较 Kiosk ID 是错误的。

通过 Origin-Byte 官方仓库冻结 e8e8efd77ab15d7b2cf30958fd748dbb3afbdaab 的合约和测试源码（文件、哈希、URL 在 evidence/official/originbyte-kiosk-manifest.json）。GitHub API 曾返回 403 限流，已用只读 shallow git clone 取得来源，未把失败读取当成功。OwnerToken 有 id／kiosk／owner；该提交没有证明旧钱包的两个历史 package 与 p2p 方法 ABI，必须由同链实际部署的 MovePackage／函数／布局探测继续迁移，不能猜成同包或删掉旧分支。两边 SDK 契约章节同步增加相同 6.1 节。

## 定向证据

- tests：158/158，13 个文件；100 项已有回归 + 22 动态字段 + 6 跨域 Provider/Hook 集成 + 16 Kiosk 故障注入 + 14 原子金额／单位边界。
- 定向 tsc：exit 0，覆盖 src/shared/rpc、core/src/rpc 及实际直接依赖，包括 NFT metadata Hook。
- 双 SDL：每次 fixture 请求同时校验检出的 RTD SDK SDL 与冻结的官方 Sui SDL（仅地址 scalar 名称替换），属于合同／受控 Fetch 证据。
- 全钱包 tsc：exit 2，仍有 183 条诊断；主要是旧 Kit、已移除旧 SDK DTO、交易／质押／Kiosk 等未迁移模块。没有宣称完整编译或 Chrome 验收。
- 初次误用 common tsconfig（缺 JSX）得到的诊断不是可比较基线；已改用实际钱包 tsconfig 重跑并保存正式 183 条日志。新／已改文件格式检查与文档完整性验证通过。
- 原始 AST 基准保持不变；新 inventory 为 after-metadata 文件。候选计数包含未使用的其它产品旧 shared core 声明，不能仅用该计数当生产 bundle 的依赖闭包证明。

详细日志：20261003-metadata-tests.log、20261003-metadata-typecheck.log、20261003-after-metadata-typecheck.log；新基准及完整检查结果见 evidence/20261003-metadata-verification.json。

## ENV-01 编译成立，ENV-02 启动未成立

读取 rtd/AGENTS.md、CLAUDE.md 和 .cargo/config.toml。以当前工作区 HEAD 49a05a0de323b45a49d067a855c419e98d071afc（含既有 rtd-kv-rpc／Cargo.lock 改动，不 reset）运行 cargo build --locked -j 4 -p rtd --bin rtd -p rtd-node --bin rtd-node。9m13s dev profile（unoptimized + debuginfo）exit 0；编译前后源码／改动哈希一致。target/debug 的 rtd 与 rtd-node 两个产物的路径、大小和 SHA256 保存在 evidence/20261003-rtd-debug-build.json。

默认 ~/.rtd/rtd_config 没有 genesis／节点配置。定位到既有 archive-events-chain 后，显式指定上述新 debug RTD_BIN 和已有配置，调用 link-u-smart-contract/all-in-one-deploy/localDeploy/toggle_local_rtd.sh start；没有运行部署脚本的 reset／fresh genesis，也没有删 DB。

启动失败：RocksDB epochs/LOCK 被既有 PID 88654 rtd-recovery（端口39214、独立监督器）持有。该进程及检查点发布／审计仍在工作，本批没有停止它们、删 LOCK 或冒充新 debug 环境。失败及 lsof/进程证据已记录；下一批先安排不干扰既有归档作业的 debug dev 配置／启动隔离。ENV-02／03、任何链上验收均未完成；没有部署智能合约。

## 下一步

继续按 Task 依赖推进 NFT／隐藏资产／Kiosk 页面、发送用 Fullnode coin 与对象 reader、身份能力准入和依赖升级；完成名称、系统／质押、历史、交易及 durable journal 后才发布可安装试用包。环境恢复可独立推进，不因共享旧 DB 被占用停止接口编码。
