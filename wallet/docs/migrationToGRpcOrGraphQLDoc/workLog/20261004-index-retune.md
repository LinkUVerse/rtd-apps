# 查询消费者预算受控更新与恢复验证

日期：2026-10-04。服务运行于既有 dev-20261003-01，未重建数据库／链／合约。

## 变更

link-u-smart-contract/all-in-one-deploy/localDeploy 新增 retune_wallet_consumer_budget.py 与对应测试。读取已有三份预算manifest，默认只预检；执行时同时持有预算、KV栈、查询栈操作锁，核验当前源码debug产物及query stack绑定、原配置和override哈希、完整启动意图及进程身份。仅停止预算变化的查询消费者。旧配置、manifest、进程记录保存在0700操作目录，文件0600并落盘；确认退出后再更新参数和退役记录，由原启动器恢复。超时／PID变化保留记录并拒绝继续。writer调整不在此工具范围内。

本次预算由 writer/indexer/consistent = 1/1/1 调整为 1/2/1，总额4不超过checkpoint适配器4许可。原生索引器65781确认退出，原启动器以同一当前源码debug产物启动30615；consistent65784、GraphQL58173复用。PID仅为本次时间点观测。使用既有publisher-venv恢复，系统python缺少psycopg，未安装或更换依赖。

## 验证与边界

- 12项预算与生命周期测试通过，包含预算上限、现有配置兼容、身份变化、PID复用、停止超时、唯一操作目录防重放、仅退役变化消费者记录；见20261004-index-retune-tests.log。
- 应用与恢复结果分别见20261004-index-retune-apply.json、20261004-index-retune-resume.json，私有操作目录路径保存在前者；未把含数据库连接信息的进程记录复制到仓库。
- 恢复后两次metrics相隔73.890528秒，22条indexer管线均推进331个checkpoint，最小水位40155，约4.48 checkpoint/s；4条consistent管线均推进166，最小水位40019，约2.25 checkpoint/s。见before／after／followup和observation JSON。这是恢复后区间观测，不能等同严格前后性能基准；consistent已成为较慢一侧，未证明整体追赶能力或积压清除。
- 钱包最新全量回归101文件1093项通过，见20261004-post-staking-full-regression.log，包含此前新增后台OriginByte和StakeCard用例。本批未修改钱包生产代码，未重新构建webpack，先前构建证据仍按原批次注明。

当前工作仅改善查询环境并补齐生命周期证据，不新增Task完成勾选，不代表Chrome、交易签名或试用验收。

认证入口复核通过：实际保存的OriginByte-only profile经钱包WalletAssetReader在共同快照40106读取到已知非空Kiosk与NFT，dispatches=0，见20261004-index-retune-graphql.json／.log。未追加默认package。文档完整性检查通过（13章、14份保留源、22 QA、21 wire RPC覆盖），仅证明文档结构；Task仍30/98、trial_ready=false。
