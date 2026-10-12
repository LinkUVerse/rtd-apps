# QA-A10当前回执事务abort与窗口关闭进展

2026-10-06。按[原父合同](./20261006-QA-A10-current-design.md)推进，父仍68/98、trial_ready=false，真实timeout与最终Q6未完成前不勾QA-A10。

[receipt-abort02](./20261006-QA-A10-receipt-abort-02.json)107项、4实际签名／6启用检查模拟／1真实Execute成功后，任务自有journal terminal `put`实际调native方法并abort其strict IndexedDB事务；actual abort event记录，原pending及三stores保持。旧context关闭及旧worker evaluate拒绝证明停止；新worker在stored away scope启动，记录原pending／所有账户锁定，然后返回原scope在两角色受控NOT_FOUND继续pending。实际execution WebLock可取得／释放后，第二窗口准备仍明确报“当前链账户有待确认交易，请先恢复原交易”，批准禁用，无新模拟／派发。解除读取故障后实际network／onConnect自动同digest终结，encrypted source不变。独立[原digest BCS签名effects审核](./20261006-QA-A10-receipt-abort-audit-01.json)0签名／模拟／Execute通过。

[popup01](./20261006-QA-A10-popup-01.json)107项、4实际签名／8启用检查模拟／1真实Execute：批准前预览后关闭窗，实际UI端口观察到0 signDappPrepared／executeDappPrepared请求、0签名／journal／派发；新原请求批准真实上游成功后关闭popup，durable pending保留。相同新worker／free lock／第二窗口pending拒绝／原摘要恢复完整通过，独立[原digest审核](./20261006-QA-A10-popup-audit-01.json)0新增派发。

首轮[receipt-abort01整轮失败](./20261006-QA-A10-receipt-abort-01.json)不修改：一笔真实上链、actual strict abort与pending／所属观察收尾均已保存，随后脚本quiesce关闭UI后仍从旧page snapshot导致Target closed。全签名not-counted、0重复派发，原profile／source／marker／frames／失败保存；02从仍活着的原worker只读snapshot修正，产品未改。另[原交易只读 native复核](./20261006-QA-A10-retained-abort-native-01.json)证明原BCS／signature／effects；[原失败profile锁定恢复](./20261006-QA-A10-retained-abort-recovery-01.json)确认原context实际已关闭后，同C21／原profile／原digest正常onConnect/network恢复，账户始终锁定、encrypted source不变、0签名／模拟／Execute／Faucet，原终态由实际协调器落盘。恢复成功不重写整轮失败／未知签名计数，不用fresh替代原失败。

所有归档身份帧／NOT_FOUND仅受控故障阶段，普通ChromeHTTPS不因此通过，未改CA／SAN／SPKI，原七profile未开。3独立新fixture中的资金、签名和交易分别记账，不能把失败01算作完整通过。当前source／C21dev候选05／ZIP03不变，未虚报新编译／全量测试；最新8debug／HEAD／diff再次核验。真实默认reader deadline超时case正在执行，最终父合同需三案齐全审核。
