# C17 当前真实执行有限验收

[实际 Chrome 输出](./20261006-c17-public-execution-01.json)和原 CLI exit 0：公开 seed 7 的隔离账户经当前 Wallet Standard 私有出口完成最小单位自转账，digest 为 9U5Sc81fhEdSNDY437yCbPpr7VQrKU3HWtwLvg2AN9W。预览摘要与最终 BCS 摘要相同，实际账户 Intent 签名、effects transactionDigest／Success、唯一 confirmed-success journal 均核验；三次模拟中的两次正式 fixed bytes SHA 与最终 bytes 相同，checks ENABLED、doGasSelection false。

总 Execute 1、模拟 3；整个浏览器重启后 journal 同摘要保持，账户启动锁定并验证密码解锁。唯一批准前 attempt、confirmed、restart-verified 和私密恢复材料保留在受控目录 c17-public-execution-20261006-01，创建与写入禁止覆盖；不自动重复发送。此次正常 CA 参数、无 SPKI；实际执行使用 HTTP Fullnode，明确未验收三 HTTPS。

[原七 journal 08](./20261006-egress-producer-c17-original-journals-08.json)执行前只读核验、当前 worker 精确匹配、链 effects 与原逻辑内容保持。[最新 debug 拥有进程](./20261006-c17-public-execution-owners-before-01.json)确认原 H0／generation、11 伴随进程、SQL 4／consistent 1／writer 1。原用户账户、原交易 profile、旧 pending／Fault 无重置；真实 gas 支出仅属于公开测试账户。

[C17 总审计 05](./20261006-c17-evidence-verification-05.json)通过 59 父项、当前实签／执行、固定资产 S、生产闭包及原文档保留；03／04 verifier 字段名错误、各阶段首次失败和旧源码保留。正常 Chrome TLS、全部域准入、独立发布声明、全部生命周期、回滚及完整试用仍待；当前产品修复 E8 时，本审计明确作为 C17 历史基线，不转称 C18 接受。
