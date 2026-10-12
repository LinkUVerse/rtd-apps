# NET-04 NC3C：Move部署声明与名称锚编码及有限验证

本批承接[全钱包合同目录](./20261005-move-contract-catalog.md)，[编码前设计](./20261005-deployment-contract-design.md)与[原状态快照](./20261005-current-state-before-deployment-contract.md)在业务源码前落盘；只新增5文件，NC1／2原17、NC3A原7和B3原11共35来源字节保持。[来源与产品冻结](./20261005-deployment-contract-source-inventory-01.json)为1042文件、b793444134ce604050bfaac31b32ee924830a85958d1c02e090ae4efdbee4fe9。父仍49/98、trial_ready=false；C1–3是本批编码／夹具及当前负面实链报告，完整部署验收开放。

## 实际行为与信任边界

`verifyReviewedDeployment`只接受独立可信发布配置传入的trustedSha256与canonical compact JSON。JSON64KiB、重编码逐字相同，拒绝重复key、未知字段、非规范地址／SHA／正u64版本、包／模块重复、未知布局；精确networkBindingKey包含完整H0、generation、profile revision、查询端点及部署selector。profile displayName、Explorer等非该查询binding成员不能冒充服务运行版本。声明包集合必须完全等于当前基础／所有可选配置；每包storageId、originalId、version、完整objectBcsSha256和全部模块bytecodeSha256逐项钉住。先复制标量再异步hash，解析结果逐层freeze；不存在从HTTP／探测报告自产hash并称签认的路径。

报告声明`authority=caller-pinned-release`是调用方提供的信任锚条件，不是核验器产生的签名；调用方必须从审核发布配置取pin，不能从dApp、同一响应或未审核profile提交者取pin。此输入及后台可信配置接入归NC5／CAP6，现有reader本批未接入全局部署gate。版本1 original由原包关联证明；升级original与独立审核声明一致仅作发布pin匹配，未独立反编译所有Move bytecode。输出显式`scope=reviewed-move-deployment`、`serviceDeployment=not-verified`、`executionSemantics=not-verified`；本地profile revision pin不证明服务软件build／服务器运行revision或所有操作权限。

`probeDeploymentCapabilities`每次从新session重新完成B3包关联与来源ABI，拒绝旧capability缓存入参。缺声明为unreviewed；声明非法在网络IO前declaration-rejected；全部pin／所选ABI及已配置名称锚均匹配才是reviewed-deployment-matched，任何包冲突是明确降级。未配置名称为unconfigured；声明缺失的已配置名称为unreviewed。输出无ready／可用client，不模拟／签名／Execute。C4实际独立发布审核及可选名称部署、C5服务部署签认仍必需，不把这些缺口勾为完成。

## 名称锚的权威对齐

[三固定官方原文与四当前RTD来源](../evidence/official/20261005-deployment-contract/manifest.json)确认[SuiNS Registry](https://raw.githubusercontent.com/MystenLabs/suins-contracts/df19300b4bd5cf39fa5e0b48ce65fc0d8cd5e522/packages/suins/sources/registry.move)有store，双Table是嵌入的UID+size handle，通过[suins RegistryKey](https://raw.githubusercontent.com/MystenLabs/suins-contracts/df19300b4bd5cf39fa5e0b48ce65fc0d8cd5e522/packages/suins/sources/suins.move)挂在共享SuiNS根；[Table框架](https://raw.githubusercontent.com/MystenLabs/sui/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-framework/packages/sui-framework/sources/table.move)不把键值存handle内。因此不GetObject两个Table UID来判定名称能力，空表也可以有合法锚。本批仅支持来源审核suins-v1；其他root／registry布局明确拒绝，RTD没有该名称Move实际部署，不能由官方源码代替实链。

声明nameRegistry指定layout、rootId、initialSharedVersion、registryFieldId。profile原packageId／双registry UID不自动扩展或推导默认；新root作为独立声明锚。先计算`RegistryKey<Registry>`键的确定性dynamic field ID，当前RTD compiler为空struct添加dummy_field:bool并Pack LdFalse，键BCS仅字节0。GetObject根及字段以现有完整canonical Object BCS／digest／UID／owner验证；根必须实际共享、初始版本匹配、类型为配置suins::SuiNS。根只验身份类型，不解读余额／管理员能力／执行语义。动态字段必须ObjectOwner(root)、完整Field类型精确、113字节canonical contents、false键、双Table UID逐一等profile，根／field前后version+digest都稳定；可变size作为本轮观察输出，未与发布时大小相等作错误要求。

额外GetPackage必须与本轮B3关联descriptor SHA相同，并精确核验Registry双字段的完整参数／abilities和RegistryKey phantom／dummy bool。不存在字段、错误trailer、HTTP不可用、2MiB预算、BCS suffix、交换双表、owner／type／共享初始版本不符、读间变化都明确拒绝；结束H0错链优先于局部失败。整体30秒（可显式1–60000ms）、POST精确三只读URL／credentials omit／redirect error，共用同一signal／全局四native读取名额，完整body及trailer完成前不释放leaf；取消可结束调用，迟到结果不能发布。

## 测试、失败和真实范围

来源独立反例／本地固定摘要、严格声明及嵌入Registry protocol夹具新增67项。全量最终[151文件1941项](./20261005-deployment-contract-full-wallet-03.log)、[完整钱包与六脚本类型／格式](./20261005-deployment-contract-checks-final-02.json)实际退出0；RPC类型03亦实际0。脚本tsconfig02显式六绝对路径，01误写相对路径在使用前查出保留，不拿未包含脚本的检查冒充通过。单元声明／BCS／模块是synthetic protocol fixture，fixture自生成pin只证明比较算法，不能当部署权威或Move执行。

[首轮63定向](./20261005-deployment-contract-targeted-01.log)实际0；[RPC类型01](./20261005-deployment-contract-types-rpc-01.log)实际2（三处夹具类型）、[全量01](./20261005-deployment-contract-full-wallet-01.log)实际1（1940/1941）、[RPC类型02](./20261005-deployment-contract-types-rpc-02.log)实际2（来源find可能undefined）全部保留。全量失败是新夹具按六个请求等待，而实际浏览器并发四名额；依据现有read-concurrency改为四个，不提高名额或超时上限。修正后[全量02](./20261005-deployment-contract-full-wallet-02.log)1941实际0；最终显式增加Move范围与服务未签认字段后再次全量03通过。两次跨cwd误读文件和一次pretty格式后的patch定位失配也未作通过，修正定位后没有旧源码被改写。

真实[current public02](./20261005-deployment-contract-public-02.json)实际CLI退出0：H0保持、末height625194、14次完整只读请求全部HTTP200，当前四包／9配置领域来源ABI兼容；`state=unreviewed`、`declaration=missing`、`registry=unconfigured`、`reviewedDeploymentMatched=false`。没有独立审核部署声明、名称／PK／原生Kiosk没有配置，0模拟／签名／Execute；[01](./20261005-deployment-contract-public-01.json)也保留。探测完成不等于部署签认通过。

[受保护回放只读检查](./20261005-deployment-contract-history-01.json)实际0、连续0–185901／185902 markers，原22水位不变、最新源及8 debug provenance严格验证，PID66145运行through386503、boundedExitCode=null。未restart／resume／操作原交易保留根；D5旧拒绝调查保留。磁盘UI／后台仍历史C9摘要，未构建或安装本批新产物、未做新Chrome。NC4账户合同、NC5完整聚合／CAP6状态缓存、NC6当前产物以及全部原业务／试用余项继续。

## 来源与文档收口

[02末验](./20261005-deployment-contract-document-verification-02.json)实际0：35文档、本地链接、双方73共享H2（72逐字一致＋1仅07→08矩阵编号链接），40当前源码与7保留旧字节、9官方／39唯一当前RTD来源摘要保持，1042产品来源未变、磁盘双bundle仍C9；三仓git diff --check实际0，规范合并13章／14来源／22QA／21RPC通过。父Task98项中49完成、trial_ready=false。

收口核对自身失败也保留：[manifest相对基目录诊断](./20261005-deployment-contract-document-verification-diagnostics-01.json)实际1，先将B3原文basename错误地相对doc root解析；随后[01核对](./20261005-deployment-contract-document-verification-01.json)实际1，其临时父ID正则漏掉22个QA-A编号而计76，文档与源码检查均保持。按现有update-migration-progress.py相同ID规则修正，02实际98／49通过；没有改动Task计数或降低合同要求。
