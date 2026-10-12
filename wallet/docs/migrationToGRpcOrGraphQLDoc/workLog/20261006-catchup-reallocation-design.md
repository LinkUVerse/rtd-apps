# 原dev追平：六名额受控再分配

现状：SQL正在追平约40万，其他两个消费者已在认证前缀586007，尚无共同S。adapter实际六请求硬上限保持；拟将固定名额2/2/2调整为indexer4、consistent1、writer1，合计仍6，每角色最多4。不增加全局容量，不修改业务水位，不改变原pending/epoch、数据库、H0、原22管线或Display覆盖，publisher/core/GraphQL/Ledger/adapter保持原进程。

只使用合约仓库部署工具。prepare冻结最新debug/source、三个拥有进程/原intent、配置字节和摘要、六名额adapter配置/manifest、两stack binding、KV manifest及query database-identity；保留全部原文件。实际indexer使用Display replay resume.toml，不能使用旧假设consumer-budget/indexer-alt.toml；它的新配置必须克隆到新operation，原resume文件与历史计划保持。首次prepare01因误用不存在的query manifest拒绝，未建operation或发信号，失败保留后按实际数据库身份结构修正。

apply只在完整准备与测试通过后执行，每次SIGTERM前校验全部归属；只发一次协作信号，不强杀。等待退出遇身份变化拒绝；仅当同一启动时间的实际Z状态才允许继续等待，不把不同身份当作正常退出。所有旧PID与原命令确已退出后才更新另两个已有override/active manifest并启动原debug、原参数（indexer仅换新config）。记录stop/config/launch intent，任何不确定部分操作不自动重放。

重启后的SQL水位必须不倒退，原22管线与Display完整集合保持；KV14/consistent4持久指标、实际native range、认证前缀、真实桥接和原journal另外核验。SQL计时样本比较真实净推进，未证明收益不称提速；如需恢复原分配，使用独立、有全部归属与备份的同类操作，不偷偷覆写记录。真实publication变化或guard拒绝单列，不手工固定publishedHi/min。此工作不关闭任何父业务任务。
