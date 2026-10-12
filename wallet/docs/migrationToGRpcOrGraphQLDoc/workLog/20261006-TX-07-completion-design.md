# TX-07父合同收口前核对

2026-10-06。父原文不改变：worker／popup／切网切账户重新唤醒恢复原摘要，不因 NotFound 解锁。

| 原合同 | 验收与证据门槛 |
| --- | --- |
| worker重新唤醒 | 当前C21 locked pending在正常关闭前实际三个stores持久化；整context关闭事件与旧worker执行拒绝证明已停止；同profile新worker字节匹配，全部账户保持锁定，不显式recover，自动查询原digest并落原terminal；加密source字段不变 |
| popup关闭 | 当前四事件实际已广播成功后popup关闭，原journal独立保存；原TRY-04实际timeout／关闭／重启证明仅作历史补充，不冒充当前重新timeout |
| 切网／切账户 | 当前四案115项实际invalidated abort，away恢复拒绝／原scope保持；返回原scope自动wake只查原digest、同原BCS／签名／effects |
| NotFound不能解锁 | 当前四案受控Fullnode／archive status5针对原摘要；保留原pending，新准备批准禁用，0追加模拟／签名／派发，解除读取故障原终态恢复 |
| 最新来源及必要回归 | C21源码／候选UI三脚本／worker精确，179份2525项实际全量含execution-reader33、coordinator40、自动wake6；源码与当前已验证build不变，不重复虚报执行；最新八debug已核验 |
| 原链真实事实 | 每一独立请求只一次真实Execute，真实HTTP200成功effects原帧／BCS／签名摘要与最终receipt一致；另一个只读audit只查原digest／GetServiceInfo；不能把受控NOT_FOUND或archive身份注入当普通ChromeCA |

父TX-07仅在全部上述当前proof与来源审计通过后勾选；不减少原32其他合同。物理断电／独立worker强杀、所有入口竞争、落盘故障、索引追上、签名返回等待和完整origin/tab等仍在QA-A10／TX-04／TX-08／TX-10对应合同中，不由TX-07代替。未通过的locked profile保持所有原pending，停止新提交；不会用fresh替代失败记录。
