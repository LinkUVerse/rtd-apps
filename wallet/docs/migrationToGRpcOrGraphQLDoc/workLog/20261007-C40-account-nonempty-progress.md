# 当前非空账户历史推进

H1–H5与QA-A13保持开放。production01实际sender声明22交易，pageSize3已取得6页18交易，60s总预算内未完成全页，因此生产reader关闭式拒绝、collections为空，没有向产品暴露18/22为完整或空历史；原body／游标／status／错误保留。不能以超时推测服务根因或将部分记录当全集。

后续v2沿用原最大60s产品预算，将生产支持pageSize改为10，sender22仍需至少三真实页；这是按实际服务成本选择合法页大小，不改变总时限、产品重试／准入／数据／coverage、Native/账户API响应或水位。recipient仍独立读当前实际窗口；未完成前不勾父项。

[实际production02](./20261007-C40-account-nonempty-production-02.json)已在原60s各账户预算内完成：sender完整22条／3真实页，窗口0–214283；recipient完整2条／1页，窗口0–214458。不同账户分别锁定各自实际窗口，不声称两个窗口相同。sender原origin实际包括affectedAddress22、Personal cap3、OriginByte Kiosk3、framework cap1，并保留真实Kiosk asset movement／ownershipProof与原events；recipient包含原directincoming。六旗标始终保持原值：registrationComplete／allActivity／allTransfers=false，其余三个范围true。framework新281963在窗口外不出现，placement180806仍为过去snapshot的internal入Kiosk，不当当前receiver归属。

这里只完成真实数据采集和范围盘点，仍需H3 fresh独立原生／canonical BCS／movement审核与H4两账户真实UI，然后H5裁定父合同；QA-A13继续开放，不把22／2当账户全集。没有改变产品源码、预算、水位或认证旗标。

## 独立原生与页面诊断（本轮）

[native02](./20261007-C40-account-native-independent-audit-02.json)22不同交易全部通过新鲜Fullnode读取，包含Genesis，两窗口首尾摘要也通过；规范transaction/effects BCS、sender/status/checkpoint、changedObjects/gas/unchangedConsensus及实际event内容/摘要一致。H3尚须Kiosk wrapper/交易相对authority及不可变索引根核验。初次调用缺少proof参数在任何IO前拒绝；native01实际第一GetServiceInfo body落盘后因Node Response.status误用为方法失败，raw目录01保留，不把它当通过。v2修复脚本重新进行全部原生读取，产品数据未改。

[sender UI01](./20261007-C40-account-sender-ui-01.json)未达到真实页面验收，原5 ERR_ABORTED保留；首版hook只遍历DOM子树遗漏React根，180秒等待没有完成正例。诊断01仅只读采集/正常重锁通过，所有query/context为空，不能证明准入或错误根因。修正根遍历的[诊断02](./20261007-C40-account-sender-diagnostic-02.json)取得实际context/query：第4秒开始history key142，一直observed/clear、configured，在第24秒实际TimeoutError“读取期限已到”；其两次503/7取消另行保留，不能归结为同一原因。该结果证明默认20秒比已观察完整读取约32秒短。

产品默认预算修复另按[C41 B1–B5](./20261007-C41-account-history-budget-design.md)推进，原C40字节/失败证据和原pending profile保持。QA-A13及H1–H5仍开放，不将诊断/原生局部或单行修复当完整父合同。

最新[QA-A13完整父审核](./20261007-QA-A13-current-completion-audit-01.json)与[合同说明](./20261007-QA-A13-current-completion.md)通过，只新增这一父项，**84/98（85.7%）、14开放、trial_ready=false**。两当前C41 owner18真实UI/22+2活动、22 canonical native交易/事件、7原生Kiosk movement、8不可变权限边界/4 sealed payload、5实际Token/Cap BCS与12新鲜检查点typed digest/ordinal独立一致；三API/六自然worker后验06通过。registration/allActivity/allTransfers=false保持，不认证历史全集或TX全入口。下方83/98及H3待补叙述为本轮早期证据阶段。
