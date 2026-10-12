# C219：C51 上游连接复用候选

C218真实Chrome发现GraphQL504，网关日志确认在连接42031时超时；C216较早也留有同类失败。现配置已用HTTP/1.1且清空Connection头，但没有命名upstream与keepalive缓存。当前仅能将它列为可优化的连接开销，不能据此断言它是所有504的唯一根因。

依据[nginx官方keepalive文档](https://nginx.org/en/docs/http/ngx_http_upstream_module.html#keepalive)，连接缓存需要upstream keepalive；它缓存空闲连接，不限制业务总查询次数。[TLS校验文档](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_ssl_verify)对应的证书验证保持开启。

候选为三个现有目的端42031/41903/41952分别建立连接池，每池最多8条空闲连接、空闲5秒、连接寿命60秒及每连接100请求；不设置页面请求上限。通过zone+resolve保留Docker DNS动态解析，显式保持原Host头，TLS/mTLS/SNI、来源、方法路径、3秒连接超时、业务超时、不重试全部保持。没有响应缓存和准入结果缓存。

实际容器nginx1.29.5已接受完整候选语法；当前配置及36actor/116container范围前后相等。初次docker cp因容器根文件系统只读被拒绝；未改只读保护，改为通过exec标准输入写已有/tmp后验证并清理临时文件。01候选保存作失败记录，02为合格候选。

准备证据：`20261011-C219-upstream-reuse-prepared-01.json`。尚未热重载、未证明实际连接复用或504消失。后续先补齐历史scope配置显式映射及回滚，再部署/三入口正反例/TLS与普通Chrome复验。P219-2/3保持开放。

## 后续实际部署：以本节为准

首次部署返回503并自动回滚。新增location级Host覆盖了server级请求头整组继承，使Origin未被清空而遭上游拒绝。原配置的server级Origin也使http级Connection清空不能继承。按照[官方继承规则](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_set_header)，03候选将Origin、Connection和等价Host统一放在server级。没有放宽任何来源规则。

第二次接口探针执行到连接复用断言后失败并回滚；当时未保存逐样本连接表，不能确定是哪一路及原因。第三次补充逐样本观测，三个上游分别连续三次使用相同TCP端点及socket inode，复用成立。GraphQL为785.789/834.798/757.815ms，archive为726.817/827.480/858.686ms，account为3309.313/3329.828/2141.850ms。三入口错来源403、State方法404、上游缺失客户端证书400仍成立。

当前已成功热重载，证据为 `20261011-C219-upstream-reuse-applied-03.json`，完整范围复验为 `20261011-C219-current-scope-01.json`。后续runtime应使用 `capture_wallet_C219_current_query_scope.py`。旧C217验证器独立检查因当前配置SHA变化拒绝属于预期。历史回滚记录保留，不代表最新状态。

容器身份及启动时间保持，未重启链、publisher、consumer或容器，没有数据库写入、响应缓存、准入缓存或新增业务重试。连接复用已证实，未来504是否完全消失尚不能证明。

## 部署后普通Chrome

完整首页刷新4 GraphQL+1 GetServiceInfo，最终余额/元数据复验5.074秒，snapshot873776，实际显示0 RTD。完整响应H0、coverage、pin/digest、owner与末页全部通过；这是一次成功样本，不能外推为所有未来请求稳定。抓包随后包括6条不完整自动刷新请求，单独记录且不计成功。

发现后续余额/元数据自动刷新分别发出admission/pin/read，尚未像首轮一样合并；由C220继续分析调度，不能宣称所有周期均4请求。总收据 `20261011-C219-transport-and-home-acceptance-01.json`，普通Chrome原生HAR及完整首周期审计 `20261011-C219-ordinary-balance-har-audit-02.json`。01旧审计的incomplete字段只意指首周期，02明确字段以避免歧义。P219-3仍开放。
