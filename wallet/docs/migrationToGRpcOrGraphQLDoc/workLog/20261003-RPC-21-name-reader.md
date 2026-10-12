# RPC-21 · 名称解析、默认展示与批准目标（实施中）

日期：2026-10-03。关联 NET-03／08／11／12、RPC-09／15／21、TX-01／05、QA-A15。本批继续既有完整迁移目标，未新增完整任务勾选。

## 权威依据与双方合同

读取当前 RTD 的 rtd-name-service/src/lib.rs、rtd-rpc-api/src/grpc/v2/name_service.rs、rtd-indexer-alt-graphql/src/api/types/name_record.rs，与固定 Sui c860146823abcedef45a1b5a9c766920be98a29c 对应源码对标。两份官方源码通过 curl HTTP 成功取回、冻结文件及 SHA256；web 工具访问相同 raw URL 返回 cache miss，未把错误页面当作源码。官方 proto 名称服务说明及 SDK querying 文档已查询；实现以实际 RTD ABI 与固定源码为准，没有采用过时 SuiNS 拍卖文档推断当前部署。

发现并处理：期限为 0 表示 leaf，必须同 registration NFT 逐级继承最近非叶子期限；gRPC NameService 在 Unknown 链无配置，而 profile 的自定义 registry 不能自动写入它；固定版本 GraphQL reverse 读取去掉 root bound，by_address 本身没有验证 forward target 回指请求地址。因此使用显式 registry 的同 S 动态字段＋Clock，额外验证正反对应。新增 wallet04章／archive原03章6.3节，双方段落完全相同，保留原目录及14份原文。

## 编码与页面接入

- WalletNameReader：私有 Fullnode 水位读取和原生 GraphQL snapshot，无旧 NameServiceAddress／NameServiceNames RPC；profile 显式 name package／forward registry／reverse registry。
- 每次名称操作取得新的覆盖准入，S至少达到开始Fullnode H；总预算默认20秒，结束验证完整H0／高度不得倒退或超过S+20。包括明确缺失的反向记录，也完成终态校验。数字20是钱包明确保守策略，不声称官方规定。
- Domain按Rust ASCII／label／长度／分隔符／@转换，限定钱包RTD TLD；动态fieldID、名称BCS／type、NameRecord value type、64KiB BCS预算及精确重编码。Clock UID／type／BCS验证；u64时间、target option、NFT、VecMap保持实际布局。node过期、leaf祖先失配／缺失／无期限、target缺失返回null；覆盖／partial／错链／格式／layout／取消错误保留失败，不当作名称不存在。
- 默认反向值与全部正向记录和Clock固定同S，target必须回指请求地址。新领域Hook绑定network/readSession，禁持久化／自动retry，失败撤下旧名称。单调TTL是链剩余期限和20秒的较小值，到期定时撤回；仅浏览器显示，不用作持久授权。
- useAppResolveRtdnsName切新Hook，因此账户列表／账户连接批准／tokens详情／TxnAddress等默认名称展示统一迁移。旧shared core hooks保留其它产品，尚须最终wallet发布importgraph清理。
- 地址输入、SendTokenForm、NFTTransferForm和两套Yup schema改为WalletRpc，移除旧一分钟布尔缓存。NFT比较解析后的规范地址与sender/object；网络异常使表单无效，实际发送入口再次拒绝sender/object目标。
- CoinTransferInput保存原名称；构建前／最终签名前新解析必须匹配批准地址、binding和readSession。名称改指、过期／缺失、错绑定或网络失败拒绝，不重选币／重建／签发其它交易；返回上一步仍保留原名称，确认页面使用已确认地址。

## 验证

- pnpm exec vitest run src/shared/rpc src/ui/app/hooks/useGetAllCoins.test.ts：297/297，22文件。新增名称reader32、表单6、实际ReactHook4、批准名称5，共47项。GraphQL查询由当前SDK SDL与固定Sui SDL验证；Fullnode用实际SDK解析binary gRPC-Web帧；BCS和名称算法用实际codec。TTL初测暴露毫秒取整早触发，改为ceil+1并验证到期撤回；不是浏览器／实链证据。
- 定向tsconfig.rpc类型检查exit0；完整钱包tsc exit2、169诊断（上批175、初始276），不能称整体构建通过。
- 18个本批源码／测试文件prettier检查exit0。13章／14原文／21RPC／22QA文档完整性通过，两套新增6.3合同完全相同。
- 最终AST扫描597文件、50 production候选、3 wire literals；相对上批54 production减少4。范围含其它产品和未用core，未证明生产bundle清零。wallet业务名称旧调用已撤出；core旧hooks还会随未清理root依赖被扫描。

详细日志为workLog/20261003-name-reader-*.log及after-name-reader-typecheck.log；源码SHA、官方证据、范围与验收边界见evidence/20261003-name-reader-verification.json。

## 尚未完成

RPC-21仍待实际registry ABI／同链部署证明、Chrome改名／续费／过期／lag／最终目标确认场景；NFT完整批准预览和全交易入口新版签名执行尚未完成。旧预览／NFT与Kiosk／质押／dApp／receipt/history仍需各任务接入；durable journal和执行锁未做。缺少配置不会自动猜测Sui／RTD默认包，不回退旧JSON-RPC。

本批没有启动dev、杀既有recovery、修改DB或部署合约。后续环境使用当前源码debug和link-u-smart-contract脚本建立独立dev；已有DB占用记录不能用旧binary替代。当前11/98、不可试用；目标继续进行，全部接口、核心实链和Chrome、试用包及22类回归均需完成。
