# 第七轮实际忙锁错误与只读观察边界

第七轮最终 failed 原证据完整保留：四单签执行拒绝、1 对同 byte 双方签名、10 变字节拒绝完成，Imported/Mnemonic/ZkLogin 私有入口为 1/0/0、Execute 0、采集/退出零错误、测试 Chrome 正常关闭。第二次 direct/expirationNone 尚未批准；现有 QueryClient 的 wallet-transaction-preview 查询原错误为“当前链账户正在签名或恢复，请稍后查看结果”。这证明实际准备被忙锁拒绝，尚未证明持锁者是前一笔、恢复唤醒或本次并发准备。旧 27 个 once 批准摘要全部排除，不重复签名，不拼接部分通过结果。

源码 BrowserExecutionLock 使用 ifAvailable=true，拒绝忙锁属于原保护。当前恢复唤醒在新连接时也会调用恢复入口，后者在锁内检查 pending；这只是候选原因，不能仅凭源码确定本次持锁者。不得强行释放、steal、清 journal 或关闭其他测试进程。

v10 使用新预算 144000167 和独立空 profile。在每次正常请求之前，只调用 navigator.locks.query() 记录现有 held/pending，并等自然空闲。该 API 只返回观察快照，不取得锁；[W3C Web Locks 规范](https://w3c.github.io/web-locks/#dom-lockmanager-query)。C187 只监听现有 UI 端口的 prepareDappTransaction/signDappPrepared/recover*Execution 请求起始时间、请求 ID 和来源，以及原批准响应错误，既不发送命令，也不复制参数、token、签名字节或密钥。退出时移除自身监听和内存。失败现场保存实际锁快照与原查询错误。

正向预览最多等待真实摘要 90 秒，不把瞬时费用失败立即判终态，也不调用 refetch/prepare/sign 重试。全 16 唯一正常批准、16 同字节 sponsor 签名、160 原签篡改拒绝、40 原模拟、16 Verify、四执行拒绝、完整原 HTTP 实体、原 14 对象/赞助币/三 store/密文和正常退出及独立审核的合同不变。签名授权与持久恢复 11/12（91.7%）、总体 90/98，尚不完成 TX-01。
