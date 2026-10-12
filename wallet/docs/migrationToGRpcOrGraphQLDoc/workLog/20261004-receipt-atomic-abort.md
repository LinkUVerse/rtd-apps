# TX-06／TX-12 原生回执事务异步中止验证

日期：2026-10-04。范围：实际 WalletExecutionCoordinator、WalletExecutionJournal 与 Chromium 原生 IndexedDB／Web Locks；网络 reader、授权、模拟、签名回调使用确定性公开测试夹具，不连接 dev 链。

## 本次补齐

在 `scripts/test-execution-journal.cjs` 增加成功、链失败两种回执场景。分别在首次 dispatch 返回回执和后续 recover 返回回执时，观察原生 journal put 请求成功，再在 pending-scopes delete 请求成功事件内调用原生 transaction.abort()。这不是用 rejected Promise 替换 journal：实际写操作、事务回滚和重新打开数据库均由 Chromium 执行。

每种场景验证：

1. 两次终态写入均确实经过请求成功后异步 abort；协调器返回 pending／storage-unavailable。
2. 独立连接重新读取时，记录仍为 dispatch-pending、无 receipt、原 scope 占用仍在，confirmedReceipt 返回 null。
3. 新 requestId 不能绕过原 pending，不再模拟、签名、验签或 dispatch。
4. 去掉故障后，重新创建协调器仅 lookup 原摘要，原子提交 confirmed-success 或 confirmed-failure 并释放 scope。
5. 各场景共 1 次模拟回调、1 次签名回调、1 次验签回调、1 次夹具 dispatch、2 次原摘要 lookup。上述次数均为 harness 调用，不是实链交易数量。

## 验证

命令：钱包目录执行 `node scripts/test-execution-journal.cjs`。

结果：exit 0，Chromium 153.0.8010.12，16 个场景通过，包含新增两种终态故障矩阵及原有跨窗口互斥、窗口关闭后 pending 阻挡接替者、NotFound 保持占用、worker 停止重启保留摘要等。

原始证据：[20261004-receipt-atomic-abort-browser.log](./20261004-receipt-atomic-abort-browser.log)。

## 边界

没有更改业务实现、构建产物、dev 环境或保留执行 profile；没有提交链交易。测试证明原生事务 abort 的原子性与协调器保守恢复，不证明操作系统断电持久性、物理磁盘故障或新钱包失败提交的真实 journal 恢复。TX-06／TX-12 保持未完成，不提高总完成数。
