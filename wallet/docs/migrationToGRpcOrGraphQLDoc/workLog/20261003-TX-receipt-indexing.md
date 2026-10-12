# TX-08 收据的索引覆盖状态

日期：2026-10-03。

新增 receipt-indexing 验证器与 useReceiptIndexing；收据页已接入中英文同步提示。链终态沿用既有selectReceiptFacts，索引状态独立计算。固定收据／session只首次刷新，Provider继续周期准入；禁止每次新snapshot key再次发起刷新造成请求循环。共同资产快照必须同binding且checkpoint覆盖目标，使用bigint防精度丢失。富详情checkpoint为空时仍在原10次上限内继续只读轮询。

验证：3文件20项通过，包括同链落后／追平、超安全整数比较、非法高度、错链拒绝、Provider快照变化后的hook显示和不重复刷新；另含既有持久收据冲突与现代富详情集成。见[测试日志](./20261003-TX-indexing-tests.log)。完整TypeScript退出码0，见[类型日志](./20261003-TX-indexing-types-final.log)。本批未重新跑全量或浏览器验收；旧构建不能作为本批产物证明。

收据页可表达资产待同步，但真实GraphQL延迟、所有执行入口的写后读和Chrome仍待完成。TX-08不勾选，总体16/98。
