# 写后读索引范围与非空OriginByte复核

## 新证据

使用原保存profile、认证HTTPS GraphQL入口和实际WalletAssetReader完整读取0xaaa。checkpoint37228成功返回OriginByte Kiosk e6c4…ae63b及NFT 8cc8…3109e，NFT版本11、digest 5Y9cixjjiWPDUWH9jqX1UZuAjKiuMTgGHX6aVFmGgNR4。未补原生kiosk包配置，profile仍只有originByte。此前checkpoint25703的空结果与本次非空结果相容，索引现已越过旧夹具创建点。

证据20261004-originbyte-index-followup.json及.log，dispatches=0。补齐OriginByte独立配置非空快照读取，不等于本轮转移或Chrome验收；RPC-22还需其余合同。

## 积压事实

Fullnode完整H0验证后当前高度181729（20261004-index-fullnode-height.json）。随后consistent-store四条pipeline水位37542，约落后144187个checkpoint；与之前本轮读取37228相比已继续推进。指标timestamp lag约31037秒，约8.6小时；这些均为时间点观测。

indexer PID65781、consistent PID65784、checkpoint writer PID4815均用kill(pid,0)确认存活。没有把日志／锁文件或旧PID记录单独当作存活证据，没有因观测延迟重启服务。指标见20261004-index-pipeline-watermarks.json。

## 配置边界与下一步

link-u-smart-contract/all-in-one-deploy/localDeploy/wallet_consumer_budget.py当前仅允许固定ingest-concurrency=1、retry=1000ms的哈希核验override；tune_wallet_consumer_budget.py是一次性转换且明确拒绝已应用状态。因此不能直接改活动TOML或再次盲跑原调优脚本。

本轮未改并发、未停止或重启任何服务、未改数据库。后续若调整吞吐，须在同一指定脚本目录实现可审计的预算迁移：先验证原配置及活动override、全部进程身份和状态，再保留旧记录、受控停止／恢复并比较同一水位指标。资源观测本机128GiB内存，两个consumer RSS约55／49MiB，尚不能仅凭这些数值断言提高并发一定有效；适配器吞吐与共享消费者预算需共同核对。

近期质押发生在远晚于当前GraphQL的区间，因此当前资产空列表不能证明最新仓位变化；新鲜Fullnode与交易成功回执继续独立展示。完整写后读及试用门槛尚未成立。
