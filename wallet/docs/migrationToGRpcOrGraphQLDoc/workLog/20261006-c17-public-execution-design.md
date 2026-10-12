# C17 真实执行的受控范围

本项使用已指定 dev 的公开 seed 7 测试账户，真实 Wallet Standard 和当前 C17 产品进行一次最小单位自转账；允许 gas 支出。原两个 profile 七条 journal 先再次独立只读核验，实际当前 worker 及最新 debug 拥有进程不变才开始。不得使用用户私钥、原执行 profile、旧 SPKI 模式或自动重放。

独立新固定目录 c17-public-execution-20261006-01；mkdir／attempt／receipt 均禁止覆盖。批准前记录请求 ID 和 preview digest；实际发送一次后验最终 bytes 的 digest／Intent 签名／effects、仅一条终态 journal，并完整浏览器重启后核对。Fullnode H0／执行前准入仍由当前正式代码完成；本项明确不声称普通 Chrome 三 HTTPS、索引共同S或完整业务 UI 验收。

新增 public-execution 开关与 Fullnode-only 零广播测试互斥，拒绝其他故障、签名持有、网络／账户矩阵及 keystore fixture 混用；要求无证书绕过参数。已有执行 helper 复用，禁止失败后第二次批准或重建同目录。网络切换 pending 02／03 保留供下一修复，其他用户数据保持。
