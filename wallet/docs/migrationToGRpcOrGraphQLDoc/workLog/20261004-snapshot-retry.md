# NET-11：GraphQL 快照读取有界重试

2026-10-04。本轮仅完成NET-11的GraphQL快照读取HTTP重试部分，未勾选整个任务。

## 实施

GraphQLSnapshot专用fetch对408、429、502、503、504最多重试两次；相同请求使用同一个AbortSignal，200/400ms加抖动退避。Retry-After支持秒数和日期，超过60秒／溢出不提前重试。等待结束、每次fetch前后均核验取消；取消后不交付迟到结果。被丢弃的响应流取消释放。

其他HTTP状态、fetch异常、GraphQL部分响应、错链、快照和覆盖错误不重试。错误响应仍由SDK原路径处理，不解析错误文案猜测状态。本轮没有改变execute、Faucet、Fullnode或归档重试策略。每次request超时没有被扩展；完整多页总预算和跨服务并发仍待完成。

源端与合并端网络章节已同步。HTTP语义核对：https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Retry-After 。次数与白名单属于钱包策略。

## 验证

- `20261004-snapshot-retry-tests.log`：2文件41项通过；含临时状态最多三次请求、非重试状态保留正文、浏览器异常直出、退避取消、预算不刷新、迟到响应拒绝、Retry-After及溢出、故障恢复后真实GraphQLSnapshot拒绝错链。
- `20261004-snapshot-retry-typecheck.log`：完整钱包tsc退出0。
- `20261004-snapshot-retry-build.log`：webpack成功，33835ms，现有样式及Browserslist警告保留。
- `20261004-snapshot-retry-static-audit.json`：最终构建四入口静态审计通过；不代表动态流量或Chrome通过。

本轮无实链交易／浏览器验收；总体仍34/98，可试用门槛未达到。
