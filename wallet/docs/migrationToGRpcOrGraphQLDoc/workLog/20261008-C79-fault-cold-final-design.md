# C79 持久数据与瞬时快照分别验收

继承 C75 首轮真实故障、七服务同 ID 冷重启、真实 marker/blob 就绪及完整数据合同。C75 错误要求冷恢复的 AvailableRange 最小检查点仍为 0，第二轮原始回复未在拒绝前留存，不能推测该轮具体差异；本次保存实际回复后判断。

Sui 官方固定源码确认写入和 BCS watermark 持久化、snapshot 仅内存：[官方 db 源码](https://github.com/MystenLabs/sui/blob/712c7263297c01fce764e8f99c17150c9b8120f6/crates/sui-indexer-alt-consistent-store/src/db/mod.rs)。RTD 本地同一结构及已发生 C71 实际回复为冷恢复单点 205；不能把历史 snapshot 范围保留当成持久数据库合同。

1. 全新 C79 物理 project／SQL／Rocks；第一轮实际输入故障与完整14／27／8基线不变。
2. 冷恢复 actual AvailableRange 先保存，要求精确字段集、链／epoch／交易数／时间戳／stride／最大205都等于原基线；最小严格205，表示恢复最新快照，绝不认证历史0–204。
3. 原指标全部保存；两个 native writer／SQL 自然 exit0、Rocks SIGINT0；完整14 HBase值及12应用时间表相同，SQL26业务表相同加 fence精确1→2，Rocks八CF逐字节相同和四原生BCS水位205。
4. 严格拒绝错误链、204／206最大水位、额外／缺少字段、epoch／交易数／timestamp变化、非205恢复下界；实际结果独立fresh SQL／原生只读CF和精确自有正常清理复核。

旧失败源码／数据保留，原服务、八debug、1015文件和钱包源码不改；有限资格不完成98父合同。
