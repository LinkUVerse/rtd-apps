# 新链查询追赶提速 U1–U6

父TRY-05/RPC/NFT查询回归。现有2+2+2消费者约每条6checkpoint/s，正式published60072已覆盖NFT54771，而共同读取仍约14K；仅等待不能完成验收。当前钱包/RTD/归档原源码/原链服务全部保留，先在新链独立候选验证容量，再决定是否切换。

- [ ] U1：当前原生/两publisher/旧六新五消费者/keys/pending/DB/八debug保护；取得实际新guard immutable image、五源文件和原compose配置，实测当前水位。
- [ ] U2：独立候选Docker FROM精确当前image，仅server.py的CHECKS8→16资源预算一行变化；其他源/API/命令/配置/TLS/VersionId/SHA/replica/fence全部完全保留。共享源文件不编辑，原scope不改。
- [ ] U3：独立41947候选同认证数据/原mTLS只读；实际6/12/12/6并发，各24次固定205请求同SHA；genesis/正式latest/超head未来/错误路径/无证书等门禁仍按实际拒绝。实测吞吐不承诺倍增。候选容器验后关闭，镜像/日志/证据保留。
- [ ] U4：只有候选兼容/实测及全部保护审核通过后，指定LD新scope image revision、独立12名额adapter launcher及4+4+4三consumer immutable override与两绑定同步更新；原6名额配置/intent/日志/数据保持，不修改共享旧launcher。
- [ ] U5：仅新guard/adapter/三consumer短时恢复，完整持久HBase/SQL/Display、自然range、正式准入/四角色/实际资产/Chrome核验。冷恢复window暂空按原合同拒绝；不改水位/租约或绕过certification。
- [ ] U6：真实连续进展与NTF目标覆盖验收，吞吐按前后实际观察分别记录；全部父合同未过不勾选。

实际候选 `20261006-default-generation-guard-capacity-candidate-03.json`、`20261006-default-generation-guard-capacity-benchmark-01.json` 通过；96 次请求，吞吐比 1.04，候选容器已移除，未安装 12/16 扩容。U4–U6 保持未执行，改按 `20261006-default-generation-prefix-speed-design.md` 检查精确前缀索引路径，不将扩容候选当作提速验收。完整进程参数仅保存在权限 0700/0600 的私有 operation 证据中。
