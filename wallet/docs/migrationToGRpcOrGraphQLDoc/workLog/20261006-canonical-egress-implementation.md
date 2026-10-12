# E3正式canonical共享库编码与有限验证

[编码前E3A–D清单](./20261006-canonical-egress-design.md)。新增正式network-admission-database.ts、dapp-egress-store.ts与16个IO前拒绝测试。WalletNetworkAdmissionStore统一open v2，原admission-v1未扫描或重写；三个store keyPath/index/autoIncrement精确验证。blocked/超时后迟到upgrade明确abort。正式egress使用canonical profile与negative记录校验，binding从profile派生；receipt/lease/mutation均WeakMap对象所有权，不接受克隆/借用/重放。任意Fault/pending拒绝最终出口；正面审批authority仍由真实调用方负责。

[正式原生01](./20261006-canonical-egress-native-01.json)29项首个通过；[02](./20261006-canonical-egress-native-02.json)44项当前通过，Chrome153.0.8010.12，esbuild实际44输入闭包及完整fixture SHA固定。242次实际native open都为本次隔离test namespace，生产namespace打开0。真实extension worker/gate共享原生DB、原v1 Fault/pending保留、旧reader拒绝v2、consume在dummy前持久删除payload、最后原生readonly回调实际同步post一次；账户/来源/请求/文档/私有owner/错generation、负面/未完观察、真实20ms TTL、64 ticket/128KiB限额、strict降级、native blocked迟到abort、worker新epoch、失败mutation的未知保留及借用/异步callback均拒绝。未调用链或任何账户/签名/Execute，仅固定public-formal-dummy。

## 编译和原准入兼容性

[定向03](./20261006-canonical-egress-unit-03.log)5文件114项；[全量01](./20261006-canonical-egress-full-01.log)172文件2442项actual exit0；[RPC类型03](./20261006-canonical-egress-types-03.log)及[完整类型01](./20261006-canonical-egress-types-all-01.log)actual exit0/空诊断。[原准入原生03](./20261006-canonical-egress-admission-native-03.log)33项actual exit0，覆盖并发、Fault/pending保留、普通关闭及worker重启；链请求/签名/模拟/Execute均0。

当前1087产品文件SHA **d0b8767b5830c969159de4f4648b794c605e8e45d4c0322448afc4a4d75b07c6**。[生产实际构建02](./20261006-canonical-egress-production-build-02.json)独立目录，原dist全文件保持；[完整生产审计01](./20261006-canonical-egress-production-audit-01.json)4 JS chunks、5783模块记录、2006源码通过，无旧RPC/Kit/fixture闭包。3体积warning、环境文件缺失/Browserslist与Tailwind既有warning保留，不安装或夸称动态抓包。独立产物不包含未接入产品的egress class（其正式原生编译入口单独验收）；产品实际准入bootstrap已引用v2模块。旧C16 UI/worker仍是运行基线，不能用C16浏览器/签名记录声称这批1087源码已接受。

## 首次失败与原来源保持

types01失败是TS对const箭头never的控制流未缩窄，保留旧store完整字节，改为显式function fail后types02/03通过。unit01误收集保存的旧.test.ts，原字节改为.test.ts.txt并更新backup manifest；unit02/03与全量通过，未更改Vitest排除范围以隐藏业务失败。生产build01误传参数，fresh-output守卫拒绝且未覆盖任何产物；build02纠正后actual0。

原准入native01/02在“先排队Fault写入”场景期望quarantined却实际unavailable：新v2需要升级，旧harness直接持有v1连接不响应versionchange，使数据库拒绝；没有启动动作/清Fault。03为native raw helper加与正式store一致的versionchange close（显式blocked测试仍覆盖此回调保持阻塞），原有33项严格标准通过。所有两次failure log、旧launcher/raw harness与临时profile/bundle保留，未把unavailable改称quarantined或取消反例。

[C16源/产物保存manifest](../evidence/20261006-canonical-egress-c16-before/manifest.json)保留两原产品文件、verifier及两个原native夹具；三个新文件单列。01/02正式原生源码分别绑定运行输入，不冒用02源码为01结果。原数据/7journal/服务/publisher未在本批操作，未打开生产namespace或改证书信任。

## 后续

E3A/B/C有限编码与正式原生通过、E3D全量及独立生产静态通过；原库实际升级及新版本UI/worker/原journal验收随E7组合执行。E4真实状态写入前屏障，E5真实批准消息私有ticket出口，E6实际UI入口/后台native源与CSP组合仍未集成。先完成这些再生成C17可运行包与实链只签名；不单独放宽CSP。父NET-04/TX-01/TX-10保持开放，总体58/98、trial_ready=false。
