# C200 当前普通Chrome解锁后真实查询

用户已明确完成解锁。原C51 ID/账户/本地网络保持，当前C198版本。浏览器控制台真实出现41957 GraphQL 504；网关日志显示连接host.docker.internal:41981超时，同时Docker DNS有wrong ident事件。只读端口与容器内TCP检查随后成功，不能称为永久故障或认定唯一根因；未重启/修改网关。正常页面重载后，UI实际显示0 RTD且各查询返回。

- [x] P200-1：用户解锁、当前版本同账户余额0RTD真实AX；通过普通Chrome DevTools正常保存脱敏HAR（85请求，非Node模拟）。
- [ ] P200-2：完整响应/H0/快照及三入口独立审核，资产与活动页终态；不将HTTP200或静态worker字节当作完整worker调用/权限/TLS通过。

HAR：20261010-C200-ordinary-unlocked-network-01.har。活动页仍持续loading；源码CompletedTransactions在history读取被准入阻断时没有提示分支，而hook禁用查询仍isPending=true，需通过确定性回归核实并修复此显示问题。账户覆盖allAccountActivityCertified=false本身只表示范围限制，不能直接推断是阻断原因。

## 当前结果

独立审核02解析全部82个完整响应，包括所有成功gRPC消息及唯一status0 trailer；85个请求全部为本扩展发往四个指定loopback端口的只读POST，2个取消和1个无body响应单列，不记通过。原生10个ServiceInfo、归档4个ServiceInfo均同H0；账户coverage完整1份同H0。余额776270/E2JdLh6yW1CwzBneiAHjrdXxd8TEL1pcKBxjoVrTxRX1快照为空，3个后续revalidation及范围包围成立。

资产页实际显示“暂无资产”，并保留未启用风险名单提示。活动页持续loading尚未记成功，C201修复已有测试与构建、待最终升级许可；不把空账户/局部窗口当全部业务验收，不把UI HAR当worker网络证明。

证据：20261010-C200-native-page-observation-01.json、ordinary-har-audit-02.json。导出HAR保留本地，未上传。
