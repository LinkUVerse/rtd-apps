# QA-A16 G16-1／2：当前质押领域回归

[实施前拆解](./20261006-QA-A16-current-design.md)的G16-1已通过当前C19的12份测试、145项，实际exit0；[完整定向日志](./20261006-QA-A16-current-targeted-01.log)。覆盖领域reader／rates／snapshot／hook／provider／view／preparation、仓位卡／验证者选择／详情／金额表单与一次提交状态机。属于正式代码的BCS夹具／渲染测试，不是Chrome实链赎回证明。

G16-2复用[RPC-11当前独立审核](./20261006-RPC-11-completion.md)：真实S586007／epoch3非空active、四epoch率、归档精确version22及整数奖励0。同时保留[原实链Pending质押／赎回](./20261004-staking-live-roundtrip.md)的历史时间与产物范围；没有重发其原摘要，也未把已删除旧仓位写成当前pending。APY样本、inactive／多pool、safe-mode补洞／缺率unknown及9007199254740993精确舍入由显式同链BCS夹具验证。2026-10-03 Rust向量仍仅作历史算法基准。

G16-3／4尚待：当前普通Chrome HTTPS、活跃详情／最终赎回批准与链回执。QA-A16／RPC-13保持未勾选，总体62/98，trial_ready=false。未增加模拟、签名或Execute，产品源码／产物与原七journal保持。
