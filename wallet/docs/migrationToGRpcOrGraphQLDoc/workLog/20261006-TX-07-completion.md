# TX-07完整合同完成：C21原摘要唤醒及NOT_FOUND安全

2026-10-06。依据[父合同收口前清单](./20261006-TX-07-completion-design.md)逐项审查，保留98原父项及完整范围，只将TX-07改为完成。总计 **67/98（68.4%）**，余31，trial_ready=false。

[四事件实际Chrome](./20261006-lifecycle-current-01.json)115项与[四原摘要独立审核](./20261006-lifecycle-current-audit-01.json)通过；[另一fresh profile锁定pending重启](./20261006-locked-restart-current-01.json)108项与[一原摘要独立审核](./20261006-locked-restart-current-audit-01.json)通过。两个独立profile共20实际签名、30启用检查模拟、5笔不同原digest各一次Execute，审计0签名／模拟／派发。普通／导入账户四事件与另一个普通账户锁定pending重启分别记录，不能合称一个连续profile；第一个两账户、第二个一账户各一次V2注资。

| 原合同 | 真实结果 |
| --- | --- |
| popup／原pending独立 | 每次真实上游成功帧暂扣后，切网／切账户／锁定／caller取消实际中止原signal并关闭popup；同原request／digest、H0／generation／账户scope在三个journal store保持 |
| 切网／切账户重新唤醒 | away恢复拒绝且原记录不变；回原scope后真实onConnect／网络／账户唤醒原摘要读取，终态落盘仅由原真实BCS／签名／effects确认 |
| NotFound不解锁 | 两角色针对原digest受控grpc-status5，原pending保持；同scope新准备批准禁用，无新模拟／签名／派发；移除该读取故障后自动恢复原terminal |
| locked worker重启 | 第二profile在真实已广播／原pending／账户仍锁定时正常关闭；context close事件及旧worker evaluate拒绝证明已停止；同profile新worker精确，所有账户仍锁定、原selected账户保持、加密source SHA不变，未显式recover／解锁即可自动原摘要确认 |
| 当前源码与真实链事实 | C21源码f867a8d4／1108、生产候选05 UI三脚本／worker逐字核验；独立5原摘要原交易BCS／签名／成功effects一致，0审计广播。当前179份2525项、类型及其日志来源保持，包含reader33／coordinator40／自动wake6；本批产品代码未变化，没有重复宣称执行编译 |

[勾选前审计01](./20261006-lifecycle-completion-audit-01.json)完成合同但计66/98，随后仅按已通过合同勾TX-07；[勾选后最终审计02](./20261006-lifecycle-completion-audit-02.json)核对67/98和来源。完整全路径源码快照保持：四案01 inputs／重启02 inputs；重启01 inputs为执行前准备版本，未把它冒充最终输入。此次整轮没有失败／重跑／未知签名数，所有原失败和七profile仍保留未打开。

受控NOT_FOUND及archive身份帧仅用于故障阶段；当前真实Node私有CA读取的身份原帧保持SHA，不称普通ChromeHTTPS通过，不更改CA／SAN／SPKI／权限。真实Execute成功响应、原签名和effects不伪造，journal只读观察未改写。官方GetTransaction语义及本地安全推论见[实施前权威核对](./20261006-lifecycle-current-design.md)。

本合同是正常关闭的locked pending跨browser／worker，未声称物理断电／独立强杀、全入口竞争、所有落盘故障、索引追上或TX-10签名等待完整矩阵。完整这些范围仍按QA-A10／TX-04／TX-08／TX-10及其它未完成父任务推进；TLS确认依赖保持。
