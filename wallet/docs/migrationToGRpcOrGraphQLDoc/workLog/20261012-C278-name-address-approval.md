# C278：名称标签与实际地址分离、真实签名执行

C277 普通 Chrome 实测发现 `TxnAddress` 将默认反向名称直接传给地址链接，导致确认页只显示名称且 explorer 路径指向名称。C278 让名称保留为辅助标签，真实地址始终作为链接目标；转账批准页完整展示 prepared.input.to，并显示同一 prepared.input.recipientName。已有前向名称不再额外发反向请求。未改签名、字节或执行重试逻辑。

[65 项针对性回归及两项类型检查](./20261012-C278-checks-01.json)、[完整构建](./20261012-default-generation-positive-C278-build-01.json)、[闭包审核](./20261012-default-generation-positive-C278-closure-01.json)通过。C277 的全套 2904 项属于前一源码基线，本次没有将旧全套计为 C278 的全套。C278 [原路径升级](./20261012-C278-ordinary-upgrade-installed-01.json)完成，C277 完整备份及原账户、权限、扩展 ID 保留，按主人的持续授权完成本地解锁。

## 名称收款批准与一次执行

普通 Chrome 当前 G4 预览显示 `wallet-migration.rtd` 和完整地址 `0xbad0f77037d2352d281607a6237bf559180c85228baf91b7144a5fa021f20456`，链接实际路径使用该地址。发送账户 3270，金额 0.001 RTD，Gas 预算 0.003988 RTD，有效 epoch 26–27，摘要 `AQ2Jo739WgnovgmUHk2rPquJ8wJkBuk7aiNXXyzr1Rzu`。最终点击前已保存[意图](./20261012-C278-name-transfer-intent-01.json)，之后只点击一次发送。

[实际 HAR](./20261012-C278-name-transfer-01.har)与[离线关键字节审核](./20261012-C278-name-transfer-audit-01.json)通过：成功模拟的精确 BCS、H0、发送人、收款人、金额、Gas、有效期、签名本地验证、一次 Execute 和原摘要确认全部一致。原摘要确认于 **checkpoint 4594**，实际 Gas **1019760 MIST**，发送人净减 **2019760 MIST**，接收人净增 **1000000 MIST**。320 条为页面、预览、等待及查询的累计记录，26 条取消/无成功内容例外保留，不能称为一次刷新请求数。

原生 AX 显示“交易成功 10月12日 00:13”、双方余额变化及真实地址链接；返回首页显示 100.02 RTD（原子余额应为 100029664489 MIST，独立当前余额核对另行补充）。当时收据仍提示资产索引同步，未假称账户历史全集已经认证。

**QA-A15.8 的名称显示、最终地址、模拟/签名字节与一次执行联验完成。** QA-A15 的真实改名/续期、registry 变更反例仍继续；此子包不使父项提前完成。

## 默认反向显示完成

00:16 普通 Chrome 打开账户切换列表，原生 AX 明确显示 `wallet-migration.rtd` 与 `0xbad0…0456` 两个独立文本，浏览器链接使用完整 bad0 地址。3270、d50b 和 9d76 无名称时继续显示地址，没有把反向名称当作账户地址。结合 C277 当前服务 `defaultName(bad0)` 正向回查通过、过期反向返回 null，以及 C278 对名称标签/地址链接的修复，**QA-A15.4 完成**。名称标签随会话和 TTL 失效仍撤下，不从历史显示字符串获得签名目标。

## 续期夹具历史读取修复

原 LD 执行器在新续期操作之前复核历史发布交易时，因 Fullnode 正常裁剪而遇到 NOT_FOUND，且尚未创建新操作目录、模拟、签名或执行。保留失败日志 `20261012-C278-name-renew-01.log`。新增 LD `execute_wallet_clean_generation_fixture_with_archive.mjs`，只在原生 NOT_FOUND 时，使用显式当前 profile 的归档 Ledger 读取：前后 H0/覆盖、原交易字节、摘要和成功效果均核验。旧脚本及原证据保留，归档客户端只能调用 GetServiceInfo/GetTransaction，不能签名或执行。

续期操作已使用该路径执行一次，摘要 `2dB6BEMfsGD59WUndb4QP6E4MsCnq1dxijt3vMvu5VQY` 确认于 4614。11 笔历史操作全部经 archive 当前覆盖内原摘要及原 BCS 核验，无历史重发；运行记录位于 G4/C278-name-renew。后续续期索引/UI 与改名验证仍待，不提前勾选 QA-A15.6。

## 续期、改名及旧记录拒绝完成

续期后的第一次真实读取在原生高度 4676、索引 4613 时拒绝 `lag`，因为续期发生在 4614，旧索引尚未反映实际字段变化。浏览器同样显示暂时不可解析且禁用检查。随后[第二次生产 reader 实测](./20261012-C278-renew-resolver-02.json)在快照 4659 正向和反向均通过，expiry 从 1 变为 1791902647739；Chrome 重新输入同一名称后检查可用且网络费可估算。第一次拒绝记录保留在 renew-resolver-01.json。

改名只执行一次，摘要 `FMnNqzf36nBShGesc7vsJGyzUY4jAvJ443evvsVS9SY1` 确认于 4699。原名称 `wallet-migration.rtd` 改为 `wallet-renamed.rtd`，真实目标 bad0 不变。第一次读取在快照 4659 对旧字段拒绝 `lag`；[后续三项生产 reader 实测](./20261012-C278-rename-resolver-02.json)确认旧名称 null、新名称正向及 bad0 默认反向均为新名称。Chrome 旧名称提示没有可用收款地址且检查禁用，新名称估算成功且检查启用。

[变更 HAR 审核](./20261012-C278-name-mutations-audit-01.json)按两笔实际变更 checkpoint 核对续期后字段、新名称目标与旧名称移除，原始流量文件为 name-mutations-01.har。该 HAR 与已核验的名称转账捕获重叠，其中的一次 Execute 是同一笔 4594 转账，不能计算成额外执行。**QA-A15.6 完成**。QA-A15.2 的现行合同更新为“索引记录与当前 Fullnode 不一致时拒绝”，不再使用零索引高度差作为准入条件；两次实际变更期间的拒绝补齐了当前合同实证。

[独立写后核对](./20261012-C278-name-transfer-closure-01.json)已通过：原转账字节、当前余额 **100029664489 MIST**、账户历史窗口到 **4750** 包含原交易，0 新模拟/签名/执行。仍未声明账户历史全集认证。
