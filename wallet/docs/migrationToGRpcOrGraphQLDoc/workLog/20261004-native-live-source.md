# 2026-10-04 原生持续 staging 源

## 实现

归档新增 `dev_native_live_source.py`，部署入口为指定合约目录的 `manage_wallet_native_source.py`。持续使用当前源码 debug blob writer、原有独立 staging IAM 和 CA；持续模式省略 last-checkpoint，复用实际生产水位恢复。原有有界 seed writer 继续显式传入上界。

持续源绑定 canonical rawDirectory、创世blob／checkpoint0、原source spec及writer身份哈希。PID记录同时包含完整命令和进程启动时间；重复start复用已核实进程，PID复用／命令变化拒绝管理；启动中断留下intent时拒绝盲目再次启动。私有独立日志保留。status／stop不初始化新目录；stop仅请求SIGTERM，不冒充已退出。

checkpoint-source在持续源存在时只复验seed，不重放有界writer；支持检查原生持续绑定，并允许生产水位高于认证seed。水位观察仍明确 `certified=false`。

## 实际运行

首次启动后观察代码误调用Docker live-source的manifest校验，返回缺文件错误；当时原生writer已启动。后续读取真实PID状态确认它仍在运行，没有重启。已把水位读取提取为共享函数，分别由Docker／native完成各自配置检查后调用。

- 同一PID4815：第一次观察staging14330／125685笔交易；再次start复用原PID，水位43355／380290笔交易。
- [重复启动输出](./20261004-native-live-source-reuse.log)与[结构化证据](../evidence/20261004-native-live-source.json)。这是采样时水位，后续会继续推进。
- 持续写入时另行复验创世至100的认证seed、固定版本回读和published写入拒绝通过，见[seed复验](./20261004-native-live-seed-reverify.log)。
- 13项相关测试通过，含错误创世／替换checkpoint0拒绝、PID复用与命令变化拒绝、中断launch拒绝、持续命令与TLS凭据、既有seed和Docker源验证。见[测试日志](./20261004-native-live-source-tests.log)。

## 边界

当前仅持续写入staging；认证published边界仍是此前已验证的100。native publisher仍需接常驻生命周期，持续发布／共同快照／公开查询门禁／Chrome试用未验收。源进程长期自动恢复、真实停止后恢复也尚未验证，不将mock PID测试写成真实恢复验收。总体18/98，ENV／TRY不勾。
