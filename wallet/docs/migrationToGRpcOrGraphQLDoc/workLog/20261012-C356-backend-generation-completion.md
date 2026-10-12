# C355/C356：同 H0 实际后端换代完成

QA-A17.8 的实际后端换代及普通 Chrome 联验已通过。使用保留的 G3 fullnode，同一浏览器 URL 从原读取部署切到独立重建的 SQL/HBase/Rocks、归档恢复桶/SQL和账户事实根；明确更新 profile generation。这里没有声称自动发现服务端代次或生产 HA。

C355 用钱包生产读取代码完成 89 次真实请求，三个账户余额/资产/Kiosk/9、6、1笔历史及归档交易正文通过。C356 普通 C51 Chrome 在换代前后实际展示 d50b 的 998.86 RTD、相同三 Kiosk、打开的 Kiosk 两件资产及九笔活动；新窗口为 0..709569，原窗口约 0..1211572。实际收据显示成功及 0.014492888 RTD 费用；页面重载后余额和配置保持。

462 条逐字节代理请求覆盖换代前后全部四角色，HTTP 200且无GraphQL错误。gRPC NOT_FOUND逐条分类：{'absent-derived-reverse-name-field-native-confirmation': 15, 'original-pending-remains-not-found': 20, 'pruned-fullnode-with-successful-archive-fallback': 1}。缺失名称对象由生产 SDK 对原四账户与 G3 reverse registry 推导核对；裁剪后的 fullnode 历史交易已从真实新归档成功回退。原待定交易仍为 dispatch-pending，不当作撤销/重发许可。

Chrome Application 面板只读确认 journal 10 条、pending scope 1 条、metadata 0 条，原 pending 摘要、requestId、H0、generation与状态均保留。Console粘贴被Chrome阻止，未绕过警告，改用Application面板；本次没有声称重新取得整个journal字节哈希。此前C280的完整哈希证明保持其原限定范围。

最终恢复 C51 G4 原配置/版本4/合约参数、原 bad0 账户，首页 100 RTD及 wallet-renamed.rtd。四账户保留；零新签名/执行。临时41957 /c356/路由已撤除（404），原GraphQL200，网关原配置字节/容器身份不变，42979代理正常停止。没有新增站点权限或CA信任。审计初版遗漏正常缺失字段的失败及修正均保留，未删除反例。

证据：[完整换代审核](./20261012-C356-backend-generation-01.json)、[生产读取](./20261012-C355-production-readers-01.json)、[实际新服务](./20261012-C355-rebuilt-backend-started-01.json)。完整持久/WAL及仅归档重建子项仍独立开放。
