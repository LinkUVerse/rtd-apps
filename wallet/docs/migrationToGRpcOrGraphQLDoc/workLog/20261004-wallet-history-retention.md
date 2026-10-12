# 独立开发链近期历史窗口修复

关联 ENV-02、RPC-20、TRY-04；不新增完成勾选。

RTD 当前源码 `rtd-rpc-api/src/reader.rs:get_lowest_available_checkpoint` 取检查点和对象保留下界的最大值；GetTransaction 再使用此区间判断可读性。配置 `num-epochs-to-retain=0` 是对象激进裁剪模式，导致即使保留交易检查点，gRPC 仍很快拒绝近期摘要读取。

在 link-u-smart-contract/localDeploy 新增 wallet_history_retention.py，并接入 initialize_wallet_dev.py。仅把独立 Fullnode 对象保留0改为2个epoch，不改变其它裁剪字段，不无限制禁用裁剪。未知配置拒绝覆盖，原文件其余内容逐字保留。首次测试发现跨节正则范围过宽，已改为逐行匹配；7项初始化／配置测试最终通过，见[日志](./20261004-history-retention-tests.log)。

通过 retain_running_wallet_history.py 核验当前源码HEAD／dirty文件／debug二进制、独立runtime和完整启动命令后，只向原PID82143发送SIGTERM，等待退出，再启动原命令。原runtime、完整Fullnode配置和转换意图保存在私有runtime/history-retention-transition。所有数据库、genesis、合约和发布数据保留；其它进程未重启。

新PID49633打开旧库需要约2分钟，期间确认该PID持续运行，未因暂时不监听端口而再启动。verify_wallet_retention.mjs 使用实际SDK gRPC验证：H0仍为原值，高度135647→135666、历史下界135445保持不变，最后按新高度读取checkpoint成功，再将runtime.ready设为true。见[证据](../evidence/20261004-wallet-history-retention.json)。初次验证端口未开放，第二次高度尚未推进，另一次手工H0参数漏字均被拒绝，没有据此宣称就绪。

启动高度验证未通过时过早执行了第二笔独立1原子单位self-transfer探测；节点返回“Fullnode is catching up: validator network recovery is still in progress”。原bytes／签名／摘要已在private attempt落盘，之后仅查原摘要，仍为null，无重发。已补probe的runtime.ready前置检查，后续未就绪不能准备或提交。此为失败尝试，不记作交易成功或恢复完成，不能创建新交易绕过其待核验状态。

两个epoch保留策略只保护未来数据，不恢复第一次成功转账已经被裁剪的对象历史；原摘要继续等待可信归档覆盖。真实Chrome后台journal恢复、跨worker与写后读尚未验收，当前仍不可试用。

同时将 current-state.md 的历史阶段叙述完整保留到20261004-current-state-history-before-consolidation.md，当前状态重新按代码、环境、交易、剩余门槛整理；totalProgress不再混入旧17／18／20项的“当前进度”结论。
