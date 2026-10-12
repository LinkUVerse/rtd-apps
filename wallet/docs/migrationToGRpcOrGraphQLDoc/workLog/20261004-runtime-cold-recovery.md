# 2026-10-04 原开发链退出后的受控恢复

任务：ENV／TRY-05 的运行恢复、RPC-04 实链验证前置。本次部分验证，不勾选完整试用项。

## 触发与恢复边界

最初查询返回503；核查发现原 Fullnode39400、原生source、adapter39591、KV、查询与账户服务的记录PID均已退出，Docker存储／门禁／TLS入口仍存活。首次probe失败保存于20261004-token-assets-observed.log，未把服务中断误记为metadata不存在。

按主人指定，只使用rtd当前源码的既有debug产物，并通过link-u-smart-contract/all-in-one-deploy/localDeploy恢复原runtime。没有重新生成genesis、删除数据库、修改水位、重复部署或补发种子交易。

## 脚本与守卫

- resume_wallet_debug_dev.py：复核源码HEAD／diff／变更文件、rtd与rtd-node debug哈希、原genesis、原启动命令及端口；拒绝存活／复用PID或同命令其它进程。独占锁内fsync保存意图再启动，沿用原config及checkpoint目录。
- retire_exited_wallet_components.py：仅允许固定10个组件，全部记录进程不存在才归档原process.json／launch-intent；不发送信号、不改配置／数据库。原source／publisher的既有生命周期独立复用。
- 原source、adapter、publisher、KV、query、admission、account workers与account API启动器依次恢复。完整启动输出含私有连接配置，留在runtime/debug-resume-16a62dfa10474454b09e7acafe00ec19下，公开日志只保留非敏感事实。
- macOS Python启动后的framework解释器切换导致admission初次记录校验失败。settle_wallet_python_start.py要求原解释器独立探测、相同lstart和完整其它参数，保存原记录后修正；没有重启或signal该PID。
- start_wallet_certified_kv.py共用启动登记增加两次相同观察、相同启动时间、精确命令和Popen存活检查；Python只接受由原venv探测出的解释器。该修复用于后续启动，没有为验证它重启现有服务。
- finalize_wallet_debug_resume.py仅在新鲜Fullnode同H0、checkpoint推进、原进程命令和全部YAML哈希保持的证明后，将ready置true。

## 已执行验证

16项受控恢复／组件归档／进程登记测试通过，见20261004-runtime-recovery-final-tests.log。初次测试有macOS临时目录/var与/private/var别名断言失败，原日志保留，测试fixture规范化后11项通过。登记测试覆盖venv切换、错误参数、消失进程、变更启动时间和精确Rust命令。

原节点PID72736恢复同一H0：3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj。20261004-runtime-resume-fullnode.json记录两次checkpoint推进，末次404989；原混合RTD发送及WMIG种子摘要均实查成功。目标保留498990120地址RTD及Coin／地址各1000000 WMIG，此为后续钱包执行前观测。

初次恢复水位20261004-runtime-resume-watermarks.json：indexer206672／22管线，consistent143156／4管线，KV135064／仅1条已观测管线。KV从桶边界重放中，不能以一个管线日志宣称完整14管线已恢复。新鲜实际WalletAssetReader仍拒绝共同快照，见20261004-token-assets-restored.log；未将该次读取记为通过。

## 下一步

继续真实资产准入／账户请求核验及消费者恢复窗口观察。Fullnode恢复及进程存活不代表索引追平、正常CA安装或试用就绪；最终水位和读取结果将在本日志追加。


## 恢复后最终观测

20261004-runtime-recovery-watermarks-final.json于21:42:18观察到indexer210006／22管线、consistent146506／4管线、KV138415／14管线；三者进程身份、当前debug与adapter配置绑定均一致。20261004-runtime-current-processes.json独立重验全部11个当前原生组件PID及完整lstart／命令记录均匹配，无signal或额外重启。

20261004-native-post-token.json同H0两次checkpoint411053→411070推进、原RTD发送／WMIG种子／新钱包WMIG原摘要均成功，目标现有496500976地址RTD和500000 WMIG Coin（钱包非原生真实转账已在独立日志验证）。该次0模拟0广播。

20261004-query-admission-current.json三种实际guard读取均成功，上界321700，unknown拒绝。这个发布准入上界不能代替GraphQL共同快照。直接GraphQL availableRange仍报FEATURE_UNAVAILABLE；GraphQL水位task记录其当前请求点低于consistent重启后下界，准确时间点及区间见20261004-consistent-recovery-window.json。原RocksDB数据保持，但重启后可用快照从新的内存下界开始，KV桶重放尚未达到该下界；不为补验清数据库或降低门禁。

实际WalletAssetReader与WalletAccountHistoryReader两次恢复后仍拒绝接纳，见20261004-token-assets-post-execution.log／20261004-account-history-cold-recovery.log，不记通过。services-read-diagnosis.json中的账户chainIdentifier查询是诊断字段不匹配引起BAD_REQUEST，不作为账户能力证明；有效生产WalletHistoryCoverage失败由上述reader日志独立记录。恢复窗口、完整账户读取及资产页面另待，试用门槛未达到。

## 共同窗口恢复后的实际读取（22:05–22:14）

token-assets-window-retry.log仍失败。随后window-retry-02.log只是fixture路径错误，未发查询；纠正为原token-mixed-funding-01/fixture.json后，window-retry-03.json接纳S143051／digest57sxwqvygZp1MfMvfVaVgrTgn7zHz8aGgvrixAnWiQNn，元数据null、目标余额空集合均是该旧S的已验证结果。WMIG种子在400826、钱包发送在409864，不把旧S的空结果当成当前Fullnode余额零或币种不存在。

owned-assets-cold-restored.json接纳S143205并返回原账户13对象，非视觉10项ID保持。account-history-cold-restored.json生产reader通过142656–143193窗口，0笔交易，registrationComplete=false／allAccountActivityCertified=false／allAccountTransfersCertified=false保持；这是有限窗口恢复，不是旧完整历史或全集认证。未重新注册、更改下界或删除数据库。

runtime-watermarks-window-restored.json于22:06:08复核debug／adapter绑定和进程身份：indexer22管线最低214759、consistent4管线151256、KV14管线143190。所有水位都是时间点事实，未追平Fullnode；Fullnode22:15:00仍同H0、checkpoint418361、Ledger／对象下界135445，见fullnode-live-clock.json。

首次恢复Chrome非视觉和Kiosk卡片成功、空详情超时失败；生产Kiosk独立读取成功后定位前台周期轮换问题。Provider修复及新产物ChromeS144419空详情／账户锁定重启通过，0模拟0广播，见20261004-snapshot-rotation.md。初次失败保持，正常CA／host权限及新部署资产索引追平另待，不能由恢复的窗口和页面推导可试用。

诊断中错误地对字符串processIdentity取list，曾在工具输出中带出本地开发数据库连接字段的字符；此为输出处理失误。后续只输出明确白名单的PID／活性／水位／绑定比较，不打印原始processIdentity或完整命令；字段内容未写入公开工作日志。
