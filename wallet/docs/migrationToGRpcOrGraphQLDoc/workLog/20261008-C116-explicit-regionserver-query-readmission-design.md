# C116：单 RegionServer 重启后的非 NFT 查询重新准入

## 范围与边界

主人要求先完成所有非 NFT 功能。当前 G3 RegionServer 的实际重启不能被旧 C91 的“29 个 StartedAt 均不变”声明覆盖。因此建立独立运行视图，保存并继续拒绝旧声明，不修改 C91/C106/C112、历史 authority、失败证据、原98父项或 fine 权重。

本批只恢复共享查询环境的运行检查与原已索引核心窗口准入。通用对象、BCS、动态字段、Display、历史覆盖用于资金、质押、名称等，继续完整检查。NFT 历史文件只校验固定字节完整性，不请求 NFT 清单、不运行 NFT 业务验证。名称当前757805覆盖门、完整物理数据/WAL/冷恢复、普通 Chrome、完整交易授权仍各自独立。

## 唯一允许的运行变化

- 容器 ID：`b94606157257745ae93ace751d9b34247e07d64d1e709926f430ad6c310fa3bb`。
- 名称：`rtd-dev-wallet-g3-20261006-hbase-regionserver-1`。
- StartedAt：`2026-10-06T16:43:48.773577177Z` → `2026-10-08T13:12:07.469704593Z`。
- FinishedAt：`2026-10-06T16:43:38.632382255Z` → `2026-10-08T13:11:59.769182214Z`。
- RestartCount：实际为1；必须 running/healthy，完整原配置和挂载一致。
- 其余28容器的运行起止时间和 RestartCount 必须保持原值。未知变化一律拒绝，不自动接受下一次重启。

固定依据为 `20261008-C114-regionserver-runtime-change-observation-01.json`；只证明实际变化，不归因于用户、OOM或代理。

## 完整验证方式

1. C91 `capture_unaffected` 完整函数只替换容器运行判断及最终期望视图判断，两处变换必须逐字可逆。新视图实际返回新的 StartedAt，不把当前启动时间改回历史时间。
2. 保留全部原 source/8debug、25进程、两组链及各端口、G0 publisher、HTTP11 listener/binding、29容器/配置/14健康检查、已退休edge清理检查。额外核对原 C93 的全部1456个受保护文件和14个输入 pin；只做历史完整性读取。
3. 在独立函数上下文中注入上述新视图，执行原 C106 完整 installed_capture、原 C98 退休历史验证和原六阶段证据检查。原文件/全函数字节不修改，发布者实际 PID/birth/argv/原venv/manifest/receipt 均保留。C112 已自然结束且未安装，禁止旧运行重试、旧authority回退或工作child信号。
4. 原 fixture 比较只使用显式命名的历史投影；恢复历史 StartedAt 的副本仅用于冻结历史声明比较，不返回为当前运行结果。当前运行结果始终包含真实新 StartedAt及显式运行谱系。
5. 完整当前发布 ledger、epoch/admission/fence/连续 prepared-tail、实际私有 mTLS guard的genesis/latest固定版本及未来路径拒绝、14HBase/23SQL/4Rocks/Display、十个声明域与原生consistent窗口、账户历史覆盖全部实读。按原 C108 核心目标524022与300秒门判定；不能套用延期NFT目标696489，也不能把门改小。
6. 独立纯函数变异检查覆盖错ID/名称/旧时间/第二次重启/停机/健康/其他28容器变动以及历史投影冒充当前。留存完整原请求/响应及真实失败，不把准备或错误框当整体功能验收。

## 可接受的结果

仅在全部运行检查和七个核心覆盖门真实通过时，报告“当前共享查询运行视图与原已索引核心窗口可进入后续非NFT测试”。`originalContainerStartedAtAll29Held=false`、`fullPhysicalDataRecoveryAccepted=false`、`walRecoveryAccepted=false`、`parentCompletion=false`，不得变为真。此运行准入不替代 QA-A20、P115-3完整数据恢复、NN-01–09或一期最终试用验收。

全过程0原服务信号、0直接DB/对象写入、0新容器、0profile/私钥/签名/Execute；对仍工作的80964/84209不作停止、冻结或重启。
