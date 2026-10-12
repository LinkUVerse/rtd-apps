# NET-05：读取绑定与执行锁作用域核验

2026-10-04。依据06网络缓存合同与05执行恢复合同逐项核查；复用已经完成的NET-12、原生journal及本轮NET-03证据，不重复宣称重跑。

| 要求 | 实现与证据 |
| --- | --- |
| 完整读取绑定 | profile.networkBindingKey使用有序JSON tuple，包含schema、id、revision、SDK network、Wallet Standard chain、完整H0、generation、四服务入口、Kiosk／PersonalKiosk／名称registry／OriginByte包及faucet；展示名称／Explorer链接不决定链数据。profile不可变。 |
| 会话重入 | WalletReadSession.cacheKey在完整binding上追加随机生命周期标识；重新进入同profile也重新准入，不能接纳旧缓存证明。 |
| 账户和请求缓存 | NET-12已逐项核验共享core的资产／余额／staking／history／receipt／name／indexed hooks：规范账户、digest／筛选、binding和session key；链及隐私查询禁止持久恢复，所有mutation禁止恢复。 |
| 执行锁不跟URL变化 | executionScopeKey严格为schema、H0、generation、规范化账户地址；URL、profile别名、revision、package不进入锁。createPendingRecord与coordinator.recover均使用此函数。账户ID／地址和批准binding另有授权校验，不以换别名解锁pending。 |
| 迟到和取消 | session.close置无效并abort；read在成功／异常交付前再次assertActive；request排队可取消，活动底层未结束不提前释放物理名额。NET-12六种切换各迟到成功／失败共12场景验证；本轮session／Provider重复验通过。 |
| 原生存储互斥 | test-execution-journal的closed-owner场景使用实际Web Locks和IndexedDB：原页面在durable pending后停在dispatch，页面关闭释放Web Lock；继任页面换profile alias、URL、revision及新bytes／request，仍只lookup原digest，simulate／sign／verify／dispatch均0。此前原生16场景日志为20261004-receipt-atomic-abort-browser.log，未在本轮重跑。 |

本轮NET-03的6文件80项包含profile、session、Provider；其中profile直接测试URL／别名／revision不改变执行scope、H0／generation改变scope、package／registry仅隔离读取。其它证据：[NET-12完成核验](./20261004-query-session-switch.md)、[关闭执行页后的持久互斥](./20261004-closed-owner-pending.md)、[原生16场景](./20261004-receipt-atomic-abort.md)。

实际Chrome账户／网络往返和旧数据撤下已有NET-12证据；真实提交期间切网络／账户的全部授权恢复矩阵仍归TX-07／TX-10，不能借本项完成提前关闭。NET-05按读取绑定／锁键／迟到屏障合同完成；总体45/98，trial_ready=false。
