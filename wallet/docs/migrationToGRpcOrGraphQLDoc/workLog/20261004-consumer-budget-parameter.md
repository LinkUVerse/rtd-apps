# 消费者并发预算的受控参数

代码位于用户指定link-u-smart-contract/all-in-one-deploy/localDeploy。wallet_consumer_budget.tuned现在接受显式整数1–4，默认仍为1；effective读取可选ingestConcurrency并同时核验原配置哈希、限定转换内容与override哈希。旧manifest无此字段仍按1校验。

checked_allocation要求writer／indexer／consistent三项完整、没有额外角色、各项为真整数（拒绝bool、float、字符串），总额最多4，与manage_wallet_checkpoint_adapter.py的BoundedSemaphore(4)一致。不能把三个消费者都改为2。生命周期调整入口仍需调用此检查；本轮没有实现或执行进程重启。

5项unittest通过，包含幂等、保持committer／pipeline配置、非法值、manifest参数与内容冲突、总预算超额。首次从仓库根调用unittest未找到模块，随后在脚本目录运行通过；并非产品失败。日志20261004-consumer-budget-parameter-tests.log。

对当前三份运行override调用effective，全部原始／有效哈希兼容通过，20261004-consumer-budget-compatibility.json。没有改活动TOML、manifest、数据库、PID或重启任何进程，所以没有声称吞吐改善。下一步实现保留记录、核验进程身份和状态的预算更新生命周期，再比较真实水位推进。
