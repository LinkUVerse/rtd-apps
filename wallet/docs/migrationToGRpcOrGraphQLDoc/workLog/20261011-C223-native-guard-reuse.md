# C223：原生查询网关复用准入服务连接

## 问题与修复

C222 六笔公开历史交易的首轮读取中，前五笔及明确版本对象通过，第六笔归档 GetTransaction 返回 503。原生网关日志在 2026-10-10 16:51:19 UTC 明确记录：`/_publication` 向 `192.168.65.254:42030/authorize` 建立 TCP 连接超时，随后 auth_request 将失败转为 503。交易查询尚未开始。保留首轮失败，不把它改写为通过。

仅将原生 nginx 三个准入子请求改为同一命名上游池，HTTP/1.1、清空 Connection，并显式保留原 Host。最多保存 8 条空闲连接、空闲 5 秒、单连接最多 100 请求及 60 秒；这是传输连接复用，不是业务查询次数上限。Docker DNS、TLS/mTLS、各入口 X-RTD-Read-Surface、实时准入、超时、方法白名单、错误映射保持，未增加响应缓存、业务重试或准入缓存。

依据：[nginx upstream keepalive](https://nginx.org/en/docs/http/ngx_http_upstream_module.html#keepalive)、[proxy_set_header](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_set_header)。同级保留所有 proxy_set_header，避免继承规则导致原有头部策略丢失。

## 验证

- 当前 nginx 语法检查通过；原 guard Handler 的 HTTP/1.1 测试在同一 TCP 连接连续返回 204/403/204，每次均调用授权函数，拒绝响应不携带旧的可见高度。
- 仅热重载原生查询网关；三轮 GraphQL、Ledger、Consistent 实际协议请求成功，H0/范围校验通过；无客户端证书为 400、不支持的 State 方法为 404。保留三轮共同的存活 TCP socket 元组及 inode 证据。
- 历史运行范围检查通过显式、可逆配置映射保留，原检查脚本未修改。当前核验入口为 `link-u-smart-contract/all-in-one-deploy/localDeploy/capture_wallet_C223_current_query_scope.py`。36 actors、116 containers、24 个基础中间件健康检查及源码/构建身份保持；没有链、发布器、消费者信号，没有 guard 重启、容器重启或数据库写入。
- C222 第二轮六笔收据与 34 个明确版本对象全部通过，54 次真实 gRPC 查询；每笔 9 次，耗时 5.591/7.806/5.012/5.143/5.672/4.629 秒。本轮无 503，不能据此声称永久消除超时或所有耗时均下降。
- 普通 Chrome 的真实公开收据和历史 NFT 版本按钮通过；原生 HAR 的生产解码器重放核验见 C222 日志。

主要证据：`20261011-C222-current-receipts-01.json`（失败）、`20261011-C223-before-connect-timeouts-01.log`、`20261011-C223-guard-reuse-prepared-01.json`、`20261011-C223-guard-reuse-applied-01.json`、`20261011-C223-current-scope-01.json`、`20261011-C222-current-receipts-02.json`。未将局部服务稳定性验证计为全部迁移完成。
