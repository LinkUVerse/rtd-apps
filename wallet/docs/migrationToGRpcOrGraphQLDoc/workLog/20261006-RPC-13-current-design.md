# RPC-13 当前仓位与赎回页面实施合同

当前72/98、C23产品，完整质押合同仍开放。保留原受控1 RTD钱包质押摘要3AxtK5qS36Vy4wCwpoJqWYGAYJ9crwL2nSKmCFPLaKDi与全部旧profile；不用重复stake或伪造仓位代替索引追上。最新原链debug保持，部署依照link-u-smart-contract内容。

- [x] S1：独立质押领域当前S、原已索引受控owner／真实非空active仓位、本金与全汇率表、BCS／奖励有理数核验；当前epoch／估算零奖励不冒充正收益兑付。
- [x] S2：当前C23隔离实际UI导入同一受控owner，验证质押汇总／验证者／仓位详情／奖励状态／赎回表单；原七profile与旧终态不打开。
- [x] S3：实际原active仓位赎回预览，最终BCS／新鲜objectRef／sender／gas／expiration／checks-enabled模拟、返回不发送和错误仓位拒绝；0签名／0Execute先独立审核。
- [x] S4：如S1–S3条件都成立，保存原attempt及一次受控赎回批准／原digest／完整native wire／strict终态和索引同步状态，重开原同profile恢复不得重发。
- [x] S5：逐RPC-13与QA-A16全部合同审核，Pending／Active／多池inactive／safe-mode／APY／奖励舍入／大额区分实测和组件矩阵；补两侧合同、完整路径来源和进度，未完成分支不得计父项。

当前只读13请求已得到S656532、epoch3、原1 RTDactive仓位与4条真实epoch汇率，估算奖励0。这条独立领域读取不代表S1全部来源审计或实际UI／赎回完成。

Current final contract evidence: ./20261006-RPC-13-completion.md and ./20261006-QA-A16-completion.md; original failed automatic withdrawal navigation retained.
