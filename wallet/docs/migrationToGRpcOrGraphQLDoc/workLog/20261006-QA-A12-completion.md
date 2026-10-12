# QA-A12 交易与事件分页完成

按[事前范围](./20261006-QA-A12-design.md)与[零地址合同](./20261006-QA-A12-event-sender-design.md)完成，父任务增加一项至61/98。当前 C19 来源1106文件／609dfb4e，原C18源码与全产物保留；只修改 indexed-lists 的零地址表示及对应测试。BG c012b851 与C18字节完全相同，UI异步chunk ac9905c5 为新字节。

[实际分页与故障矩阵05](./20261006-QA-A12-pagination-matrix-05.json)及未修改的实际 wire 哈希：正式 WalletIndexedLists 在固定0–586007、H0保持的窗口，16笔发送交易／13事件的ascending和descending同集合逆序，交易各17页、事件各14页，末页均真实空终态。事件原生BCS／sender／模块／内容／类型核验，返回4种事件类型。测试transport将wire页大小50缩为1，并150ms节流，产品查询大小仍50；不修改服务／链／水位。

[实际过滤01](./20261006-QA-A12-live-filters-01.json)再验证type精确过滤5条StakingRequestEvent、两方向空交易sender／空module事件，所有完整结果都在最后revalidate后接纳。坏交易cursor与坏事件cursor分别提交真实后端，HTTP200带GraphQL解析错误，正式reader整批partial拒绝。

24条矩阵记录中，空扫描中间页推进、空终态、重复、停滞、SCAN_LIMIT部分回应、第二页deadline／session取消、分页预算、预取消为明示有限重放故障夹具；不是声称实际后端发生这些故障。完成审计额外逐项核对期望错误类型／reason和页数、timeout物理promise已settle、预取消零IO，所有拒绝不返回半页或cursor。实际服务正例及实际坏cursor分开标记。

[30项定向](./20261006-QA-A12-targeted-01.log)、[178文件2514全量](./20261006-QA-A12-full-01.log)、[类型](./20261006-QA-A12-types-01.log)均实际退出0。当前[dev构建](./20261006-indexed-event-c19-build-01.json)、[实际Chrome UI／worker](./20261006-indexed-event-c19-readonly-01.json)、[原七journal](./20261006-indexed-event-c19-original-journals-01.json)、[独立production构建](./20261006-indexed-event-production-build-01.json)及[5274模块／2032源码闭包](./20261006-indexed-event-production-audit-01.json)通过。生产2个已有warning保持，零新增模拟／签名／Execute。原始两profile的逻辑／effects不变。

失败01是测试页数等于条目数的错误断言；02／03为当前原生事件null sender拒绝，03实际wire及旧源码保留；04测试旁路先解析非JSON响应而抢在正式retry处理前失败，保存原脚本并改为先记录response、使用150ms节流，05全页实际200成功。所有已有日志／来源保留，不删失败或把后来通过覆盖失败。官方commit96de77e3、固定源码和SHA独立保存，两侧技术方案加入同一规范。

[完成审计](./20261006-QA-A12-completion-audit-01.json)固定所有输入SHA。Node查询只用公开dev CA，普通Chrome三HTTPS仍TypeError；QA-A19／ENV-07继续开放。C18的真实签名／一次执行属该历史UI版本，当前C19拥有相同BG且只改只读事件解码，不宣称本次又执行。QA-A13账户全集、全部98项及trial仍未完成。
