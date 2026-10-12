# 当前迁移状态（2026-10-06）

**79/98（80.6%），剩余19，trial_ready=false。** 当前C28源码1113文件，SHA `4ccafc8f1fb55685171a6b1516aaae014e8324087a500ffc12d32e2d914a5a06`；183文件2573单测、完整类型、独立production及闭包审核通过。[本批完成范围](./20261006-C28-observation-owner-completion.md)、[当前独立审核](./20261006-C28-observation-owner-audit-01.json)、[reload补充审核](./20261006-C28-owner-reload-audit-01.json)。

## 发布清理与成本

[QA-A21完成](./20261006-QA-A21-completion.md)：当前完整五入口/七chunk闭包、8审计反例、有限实际四角色流量、原生Chrome隔离profile单一启用钱包及真实四预算通过。完整业务抓包由REL-02继续，TLS/权限和新资产正面仍开放。首轮白名单过窄与四入口计数误用的失败保留。

## 本批验证

读取观察v3原生独占锁与原票标记已经编码；17项原生所有权、33项原存储合同、24项实际设置/普通浏览器重启通过。真实production浏览器重启13项证明保留原票、新incarnation接管、校验前不接纳余额、重新完整读取WMIG。实际页面reload9项证明重新完整读取且pending/marker归零。原未知无标记pending仍阻止读取，未通过等待或清库冒充恢复；普通交易journal未改。

C28当前独立包四入口HTTP200同原H0，UI/worker与磁盘精确字节，0公网/旧RPC/页面错误/证书变更。[有限开发观察指南](../C28-当前开发观察与有限试用说明.md)。旧C21 dist/ZIP、C26/C27包/源码、原失败profile与日志保持；历史版本证据按原范围引用。

## 环境与后续依赖

原主链16577，同H0/generation/配置/DB/latest debug；六消费者包括恢复后的GraphQL6803仍在。Docker相关依赖当前Up，但完整冷恢复验收仍开放。[最新原生查询窗口](./20261006-owned-query-window-09.json)一致窗口670805–726884，GraphQL726884。

原publisher3664/child63025继续原pending907824/epoch1；完整已发布前缀726885个checkpoint审计实际完成（2295秒），正在新checkpoint拷贝与逐项落盘。[最新只读进展](./20261006-publication-copy-progress-02.json)逐checkpoint ledger最高810669，**不等于正式发布或索引覆盖**。名称/Display/Personal/OriginByte正面夹具大于当前发布水位，继续等待真实覆盖。

支持的4→8并发只读4096checkpoint对照通过，暖缓存收益有限，不承诺倍增。安装准备03与实际无等待边界检查通过、未安装/0信号；[900秒guard实际终态](./20261006-supported-publisher-capacity-progress.md)未遇自然空闲边界，installed=false、0信号。下一次安装仍须natural published/idle、无child、SQL pending=null、来源/debug/六消费者/全部门禁；不停止working批次、不手改pending/epoch。

## 当前账户活动页

[真实空窗口7项及原响应审核](./20261006-QA-A13-current-window-progress.md)通过：670805–726884、0受支持活动、六覆盖旗标原样保留，页面仍明确不是历史全集。非空各类业务语义仍开放；采集失败和无关元数据等待失败均保留，产品源码未改。

## 开放任务与验收范围

RPC-03/22/23，TX-01/04/08，ENV-07，TRY-05，QA-A07/13/14/15/17/19/20/22，REL-02/03/05仍开放。优先索引覆盖后的NFT/名称/写后读与全入口竞争，同时推进不依赖新水位的历史语义和UI回归。正常Chrome的原HTTPS CA信任与新增自定义网络原生权限仍待用户回答；未导入CA或批准原生权限，不以HTTP开发例外替代这些验收。

全量详细历史已原字节保留在[上一current-state](./20261006-current-state-before-C28-qualified.md)。原34/98至78/98各阶段证据、失败、密钥/profile/journal和完成父任务依据均保留；未执行的必需验收不会勾选。
