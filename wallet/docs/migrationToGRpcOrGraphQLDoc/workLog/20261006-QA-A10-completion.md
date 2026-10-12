# QA-A10完整验收：当前C21三种真实故障与原摘要恢复

2026-10-06。按[实施前Q1–Q6](./20261006-QA-A10-current-design.md)及原98项合同验收；[父项勾选前综合审核](./20261006-QA-A10-completion-audit-01.json)通过，勾选后再生成02。仅QA-A10新增，69/98（70.4%），余29项，trial_ready=false。

| 当前实际案 | Chrome检查 | 实际签名 | 启用检查模拟 | 单次真实Execute | 独立原摘要审核 |
| --- | --- | --- | --- | --- | --- |
| receipt-abort02 | 107 | 4 | 6 | 1 | [通过](./20261006-QA-A10-receipt-abort-audit-01.json) |
| popup01 | 107 | 4 | 8 | 1 | [通过](./20261006-QA-A10-popup-audit-01.json) |
| timeout01 | 107 | 4 | 6 | 1 | [通过](./20261006-QA-A10-timeout-audit-01.json) |
| 合计 | 321 | 12 | 20 | 3 | 3个不同原digest |

批准前关闭popup没有签名leaf调用、journal变化或Execute，仅2次准备模拟；新窗口重新准备后，批准后关闭仍保留原pending。timeout保留真实上游HTTP200成功响应，原reader约20秒自行触发TimeoutError，没有缩短产品deadline。receipt-abort针对同一confirmed原记录调用真实IDB put后abort strict事务，实际abort事件与pending保持均核验，不篡改journal数据。

三案旧context关闭和旧worker求值拒绝均实测，新精确worker的账户全部锁定，受控两角色NOT_FOUND只针对原digest；即使原Web Lock已释放且实际重新取得，第二授权窗口准备仍明确拒绝“当前链账户有待确认交易，请先恢复原交易”，没有追加签名、模拟或Execute。解除受控读取故障后由真实连接／网络唤醒自动确认原digest，全部持久stores与完整BCS、签名及effects逐项一致，加密账户source保持。三个审计0签名／0模拟／0派发。

receipt-abort01因测试脚本在关闭页面后读取旧page而失败，整轮签名not-counted保持，原已注资profile、attempt、frame、pending、原失败及全路径源码快照均保存。[原摘要只读审核](./20261006-QA-A10-retained-abort-native-01.json)及[原profile单独锁定恢复](./20261006-QA-A10-retained-abort-recovery-01.json)通过：0新增签名／资金／模拟／Execute、账户仍锁定、加密source不变。该案原1Execute／6模拟单独保留，不加入上述三案成功总数；不把失败整轮改成通过。

当前产品f867a8d4／1108文件、候选05及ZIP03不变，既有179文件2525测试与类型证据按原时间保持；本次没有重新编译或声称新全量测试。最新8个RTD debug逐字核对，没有重启dev／重置链／打开七个历史profile／改CA信任。归档身份的Node私有CA原帧只用于明确受控故障阶段，不能当作普通Chrome HTTPS验收。本项验证正常context关闭后的旧worker停止，没有独立hard kill或物理断电声明；正常HTTPS、完整业务页面及其余29父项继续。
