# 2026-10-04 认证来源的原生查询组件

当前源码debug构建indexer／consistent-store／GraphQL通过，4m13s，构建provenance在runtime/certified-query-provenance.json。部署入口 `start_wallet_certified_query.py` 固定源码／二进制／pipeline配置／适配器身份；native-query-stack使用foundation PG中的独立wallet_certified_query数据库，不修改旧诊断query-services。

独占身份文件与PG registry绑定：writer为该新库owner，reader仅CONNECT／schema USAGE／表SELECT和未来表默认SELECT；两者均非superuser／createdb／createrole／replication／bypassrls，reader默认事务只读。原生进程使用PG TLS证书校验；私有DSN和进程命令记录不得复制到公开日志。indexer和consistent只从39591认证检查点适配器读取且require-published-watermark开启，GraphQL连接新的Ledger39585／consistent39541。

## 实际状态

- indexer PID33639；consistent PID33642；等待PG水位建立后启动GraphQL PID36527，地址39540。
- PG写／只读角色权限实测通过。GraphQL完整H0、checkpoint0摘要与固定checkpoint16摘要正确。
- 默认最新checkpoint返回9223372036854775807／null，availableRange也为该上界，**不满足钱包准入**。
- 查当前源码task/watermark及运行日志：PG索引已到100，GraphQL请求consistent的100快照时，consistent范围仍0–18；其水位未初始化到共同覆盖。consistent已取到100，但19在读取committed marker时多次遇503后重试；本机适配器只有4并发且与高预取KV共用，是接下来需要验证并调整的预算问题，尚不把原因推断写成最终修复结论。
- 当前published仍100，认证publisher原PID持续处理pending100251，采样ledger已21012行，不改写为完整提交。

[角色与固定查询证据](../evidence/20261004-certified-query-bootstrap.json)、[构建日志](./20261004-certified-query-build.log)。Python脚本语法检查通过，共用build-binding的2项原有定向测试通过；没有将这些代替完整查询验收。

下一步修复消费预算与共同覆盖等待，验证同快照资产，再接query guard／公开GraphQL和gRPC-Web。现有正确固定读取只证明局部功能，publicQueryReady=false，总体仍18/98。
