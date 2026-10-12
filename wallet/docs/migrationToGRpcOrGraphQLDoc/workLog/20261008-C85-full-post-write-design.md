# C85：完整十三对象与三账户写后验收

当前仍84/98，剩余14项，trial_ready=false。C53是完整验收范围；C84八件NFT及源账户历史工具仅补充，不能缩减C53五个cap、归档固定版本、资产S和三账户完整受支持窗口。原C53源码及51合同检查保持；C85生产工具仅将已资格化的publisher ownership导入从C44改为C83。

1. [新鲜七覆盖02](./20261008-C83-nft-post-write-readiness-02.json)正式486334、pending553728，七门均未达到原六笔目标524022。[完整工具preflight](./20261008-C85-full-post-write-preflight-01.json)实际0session／0请求，正向未执行。只有七门同时成立、readiness小于5分钟、H0／generation／原29容器14健康／1015私有文件和1120产品来源保持时进入生产读取。
2. 原生产五reader与原十三对象合同保留：三账户同一资产S，八NFT加五cap；native当前规范完整Object BCS、十三个明确归档版本及内容一致；资产S的typed CheckpointSummary／Contents摘要和序列、epoch、累计交易数、contents摘要序列前缀绑定。Contents全BCS规范重序列化及transaction/effects顺序与protobuf一致。该审核只对Summary序列前缀及typed全摘要作字节绑定，不冒称解码Summary全部可选尾部。
3. 原六交易详情BCS与原批准完全相同；三账户受支持历史分别固定snapshot／lo／hi，完整游标分页、total、去重及排序，全部返回行的TransactionData／Effects规范字节、typed摘要、sender／checkpoint／SUCCESS或FAILURE一致。原六／五／一笔按账户各核对原始交易与effects、成功checkpoint，历史与资产S分别记录。registrationComplete和allAccountActivityCertified保持false，不升级全账户认证。
4. [独立准备](./20261008-C85-full-post-write-preparation-independent-01.json)确认仅ownership导入变化、原51合同及五实际reader断网解析；[历史字节资格02](./20261008-C85-history-checkpoint-byte-qualification-02.json)实际解码两个旧窗口全部24行、两个旧checkpoint及原六native详情，22检查。第一次将重复首屏当作非法而未考虑合法重试的测试假设失败保留，后继检查重复中间游标被拒绝；被选中的最后完整尝试必须无缺页。历史原回复保持，request envelope从原query／variables重构，不能称原request wire。另有[C84对象字节22检查](./20261008-C84-positive-byte-parsers-01.json)，均不计当前524022正向。
5. [完整独立审核工具资格](./20261008-C85-full-positive-auditor-prepared-01.json)包含实际拒绝coverage-denied artifact、源码语法和全部资格pins。正式正向输出使用probe-C85-post-write-indexed.cjs，然后audit-C85-full-post-write-indexed.cjs；独立审核额外fresh只读核对当前完整publisher ownership。审完十三native／十三archive／资产GraphQL／原六详情／三窗口全raw后，才计实际写后索引。Chrome正常重锁／原journal保持及只读刷新、普通CA和权限另验。

运行中的原child17722正在完整审核已提交486335条，目标pending553728；诊断计数不等于提交覆盖，不因诊断跳过旧prefix。原child及原父未发信号；C83单次观察和严格sealed-tail门保持。若原publisher自然完成批次并覆盖目标，可直接验收数据；候选安装是提速手段，不能成为凭空完成父任务的理由。失败收据、未完成范围和旧工作日志保留，不重发原六笔。
