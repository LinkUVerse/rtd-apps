# NET-11：跨reader共享读取并发预算

2026-10-04，本轮继续NET-11，保持未勾选。

## 改动及依据

合并方案第03章建议并发4个，列表页顺序读取。此前各reader有超时与取消，但跨独立请求没有统一运行队列。

WalletReadSession.request现提供4个运行名额、64个FIFO等待名额。调用方先建立超时信号，再进入队列，等待不会重置截止时间。等待取消立即移除，过载明确报WalletReadBudgetError。运行请求即使忽略取消也要真实结束才释放名额，迟到结果拒绝。失败也释放并推进下一等待者。

接入Fullnode各只读方法、GraphQLSnapshot、账户历史扩展、归档对象／checkpoint和Ledger交易及回退查询。SDK单次完整awaitable占名额，持有到正文及trailers消费完毕；不在fetch响应头或组合reader外层释放／获取。因此账户历史内嵌GraphQL准入不会嵌套持有名额，分页与前后身份查询各自独立获取。

限制是单WalletReadSession，不是跨窗口全局配额。准备器内部解析、模拟、执行／恢复专用reader和独立准入探测未全部纳入。NET-11统一错误分类和剩余预算仍待推进；本轮未改execute自动重发规则。

## 验证

- `20261004-read-budget-tests.log`：8文件129项通过。新增5项验证FIFO、错误释放、排队取消、队列上限、关闭会话、忽略取消占用，以及真实GraphQL／gRPC SDK共享名额并等待正文结束。可控响应流不等同实链或Chrome测试。
- `20261004-read-budget-full-regression.log`：111文件1185项通过，为本轮完整钱包Vitest回归。
- `20261004-read-budget-typecheck.log`：完整钱包tsc退出0。
- `20261004-read-budget-build.log`：webpack成功，保留原有构建警告。
- `20261004-read-budget-static-audit.json`：最终四入口产物静态审计通过，仍不证明动态流量或浏览器验收。

双方第06／05网络章节对齐，Task及总进度更新。总体34/98，未达到可试用门槛。无新增实链提交。
