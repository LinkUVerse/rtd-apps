# TX-11：四类入口统一恢复协调完成

2026-10-04。此项验收四入口接入同一持久恢复协调器，以及批准请求生命周期与journal分离。实际NFT／Kiosk转出、所有链失败／并发故障、切网授权等由RPC／其它TX／QA继续跟踪。

## 四入口核对

| 入口 | 准备前恢复与提交 |
| --- | --- |
| 币发送 | transfer-coin/index先调用recoverPreparedTransaction；StrictMode只共享同一scope只读恢复，pending／错误阻挡准备。批准固定bytes后executePreparedTransaction，未知结果回恢复。 |
| NFT | TransferNFTForm先恢复，未检查／pending阻挡准备；统一background命令提交批准bytes，pending只允许查询原交易，切账户／会话撤销旧预览。 |
| 质押／赎回 | StakingCard同一恢复及执行命令；金额只解析一次，最终批准bytes固定；pending与检查失败阻挡准备，StrictMode恢复去重。 |
| dApp | DappRecoveryGate在journal检查成功前不挂载预览；executeDappPrepared进入同一WalletExecutionCoordinator；recoverDappExecution校验原request／origin／account／binding，只lookup原digest并核验原签名／effects，不再消费批准token。 |

background/execution.ts与dapp-execution.ts均使用WalletExecutionJournal、WalletExecutionReader、WalletExecutionCoordinator及默认BrowserExecutionLock。后台wakeups和UI只合并正在进行的只读恢复，绝不合并或重复dispatch。恢复每个调用方返回前仍做授权复核。

Transactions.ts finally只撤销内存request signal、prepared registry、旧批准请求记录及popup，没有引用journal清除接口。原生journal只有严格事务成功后的receipt提交才能同时写终态并释放pending；页面关闭／旧请求清理不替代这个条件。

## 本轮验证

- 后台与协调器5文件91项通过：Transactions、execution、dapp-execution、execution-recovery-wakeup、execution-coordinator。
- 四入口页面4文件25项通过：transfer-coin、TransferNFTForm、StakingCard、DappRecoveryGate。覆盖初始pending／失败、迟到恢复、双击、批准会话切换、恢复前禁止挂载预览及原结果返回。
- 真实Chrome在既有staking-execution-browser-01做只读复核，当前worker SHA与磁盘d11c911981cc817408cea3374cf534728429b801dd46c3ef86d6eca0f092acc0一致。原质押3AxtK5qS36Vy4wCwpoJqWYGAYJ9crwL2nSKmCFPLaKDi、原币转账AaAKoHj3DgqcwWBvTpPJLjaCwAd2zgoszj1Bu7MKrnSr均保持confirmed-success；账户锁定，0模拟／0提交。没有再次批准。
- 首次浏览器失败在current worker verification：扩展热重载后ui.html被ERR_BLOCKED_BY_CLIENT拦截，尚未检查journal；关闭后重开相同profile成功。失败日志保留，不用成功重试抹掉此前失败。只读脚本输出补充recoveryOnly与准确scope，避免旧固定文案误称本轮执行。
- 真实dApp超时／popup关闭／整个浏览器重启的原摘要恢复复用已通过TRY-04证据；本轮没有重新运行dApp执行，不冒充新的端到端链路。

日志20261004-TX-11-tests.log、20261004-TX-11-ui-tests.log、20261004-TX-11-retained-coin-readonly.log及-retry.log。TX-11按编码／恢复协调合同完成，总体46/98，trial_ready=false。当前环境资产共同快照恢复另外跟踪，不由两条终态journal复核代替。
