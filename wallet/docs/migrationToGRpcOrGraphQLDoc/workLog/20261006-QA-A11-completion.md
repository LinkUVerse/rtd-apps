# QA-A11：裁剪后的长期详情完成

正式读路径与直接原生 Fullnode 见证分别执行，三个脚本实际 exit 0。[直接裁剪见证](./20261006-QA-A11-fullnode-pruned-03.json)在同 H0 前后确认最小保留 checkpoint 181737；历史交易、checkpoint 914、系统对象 0x5 version 1 均返回 RpcError NOT_FOUND，未使用归档回退。

[归档详情](./20261006-QA-A11-archive-detail-01.json)经正式 WalletLedgerReader 回退和 WalletArchiveCheckpointReader 按高度／摘要读取；交易摘要、checkpoint、success、epoch、effectsBase64 与 10 月 4 日独立保存的记录逐字一致，checkpoint 两种 selector 返回相同摘要。[历史对象](./20261006-QA-A11-archive-objects-01.json)使用 20+3 分批，21 个重复的历史 selector 均保持对象 ID、version 1 和历史摘要，两未知对象槽保持 NotFound，不切换 latest。

[综合核验](./20261006-QA-A11-completion-audit-01.json)固定独立历史证据和本次证据 SHA，核验同链及所有比较条件。当前 C17 全量 176 文件 2501 测试包含错误 ID／版本／摘要及错链拒绝；真实服务成功和合成拒绝分别计入。Node 子进程只信任公开 dev CA，本次无签名、模拟、执行、浏览器或系统信任修改；普通 Chrome HTTPS 验收仍待 ENV-07／QA-A19。

01／02 裁剪见证首次失败完整保留，02 指明 GetCheckpoint 请求未使用 protobuf oneof，属于脚本错误，03 修正后完成；原失败源码保留。此前提前报告完成已纠正，只有综合核验完成后才勾 QA-A11。总计 59/98，trial_ready=false。
