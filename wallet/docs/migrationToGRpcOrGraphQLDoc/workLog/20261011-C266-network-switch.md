# C266：当前普通 Chrome 网络切换与迟到资产读取

## 自然退出补验已完成

独立、未连接业务路由的相同关闭逻辑入口于2026-10-11 12:55:46 UTC自行退出，实际1800.131秒；进程及42970端口均已释放，零终止信号。[补验报告](./20261011-C266-natural-autoexit-qualification-01.json)核验源码差异仅固定证据目录名、真实事件/时间和进程/端口终态。P266-1现已完成。该自然退出时无在途请求；下文提前清理的原浏览器入口及当时未通过声明保留为历史。

## 实际结果

当前 C257 普通 C51 Chrome 完成同 H0、同 generation 的 GraphQL URL 切换、缺少 GraphQL 的拒绝读取及恢复。旧资产响应已由真实服务生成并在临时入口保持10秒；点击保存新配置196毫秒后，下游连接被取消。561毫秒后释放原响应时连接已销毁。浏览器 HAR 对应 `net::ERR_ABORTED`，之后没有继续访问旧 URL，也没有重新显示旧 NFT。该范围通过，不等于 QA-A17 的完整换 H0、换 generation、registry、709570点回放或 WAL 通过。

完整[独立资格报告](./20261011-C266-qualification-01.json)将[原生 HAR](./20261011-C266-network-switch-01.har)、[实际 UI 时间线](./20261011-C266-native-ui-04.json)、入口事件及原始请求/响应摘要对应。全程没有 ExecuteTransaction、SimulateTransaction 或新交易。

## 真实操作与恢复

1. 保存原 C51 网络表单全部字段及 packages；原已保存 revision 为1，表单自动显示下次 revision=2。
2. 切换到 `c266-late-read` revision=1，GraphQL 为既有 origin 下的 `/c266/graphql`。真实资产页显示 `Migration Display V2` 和“暂无媒体”两项 NFT。
3. 对同配置 revision=2 移除 GraphQL，fullnode、archive、账户历史和 packages 不变，完成链身份预检。待该账户的实际 `WalletSnapshotRead` 响应已生成并挂起后，点击保存。
4. 页面拒绝不完整查询；实际延迟释放后再次观察，NFT 链接仍未出现。HAR 的取消请求为第47帧，约9.884秒，服务端取消和浏览器结束时间吻合。
5. 重新预检并保存原 `c51-tls-acceptance` revision=1，全部表单字段与 packages 对比基线相等。两项 NFT 正常恢复，首页余额显示149.99 M RTD，3270、9d76、d50b、bad0四个测试账户均保留。最后保持正常首页。

## 实际请求审核

[生产 reader 补验](./20261011-C266-network-audit-01.json)共62请求：53 GraphQL、7 GetServiceInfo、2 PNG，全部逐项计入。12个完整资产读取周期通过生产 reader 解码，1个在途资产读取取消被拒绝。最开始单独的读后检查缺少本次捕获前的准入，单列为结构核对；另1个 genesis预检独立核对，不补造前序请求。7个原生帧解码 H0、尾帧状态和边界，2个 PNG 签名有效。

本地106个 RPC 模块与已观察安装 C257 的源码映射相同，产物哈希相同。本次没有钱包升级；离线 reader 回放不冒称重演原异步调度。

## 临时环境与清理

入口实现和部署操作均位于 `link-u-smart-contract/all-in-one-deploy/localDeploy`：

- [serve_wallet_C266_graphql_delay.cjs](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/link-u-smart-contract/all-in-one-deploy/localDeploy/serve_wallet_C266_graphql_delay.cjs)：仅本机42970、指定 extension Origin、指定 GraphQL 路径和只读 query；响应保持原文，一次性延迟10000毫秒，配置1800秒退出预算。
- [预检实证](./20261011-C266-proxy-readiness-02.json)：方法405、路径404、错误来源403、mutation400、OPTIONS204；延迟10.596秒、后续未延迟0.476秒，正文一致。
- [manage_wallet_C266_graphql_alias.py](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/link-u-smart-contract/all-in-one-deploy/localDeploy/manage_wallet_C266_graphql_alias.py)：只对既有 C51 网关增加一个精确路径；测试后恢复原配置字节，原路径200、临时路径404、错误来源403，容器身份和原 C219 keepalive 配置保留。
- PID88285按实际命令、启动时间、源码摘要核验后 SIGTERM，记录正常退出，42970已释放。原发布父22156/子78607未收到信号，没有新增容器或镜像。

1800秒自然超时退出未实际等到：完成测试后提前正常清理，报告明确 `actualNatural1800SecondExitObserved=false`，不能称该自然超时路径实测通过。

## 保留的过程异常

初次准备直接42970地址触发权限提示并已拒绝。随后一次编辑在 DevTools 打开时误落入 Filter，已通过返回表单并使用实际字段 setValue 纠正；第二个直接端口提示消失时工具返回“用户改变应用”，无法确认授予动作的执行者，因此不声称整个准备过程零权限变更。最终验收 URL 使用原授权41957 origin；操作未再要求新 origin 权限。

首次身份断言因 Node 符号链接路径不同失败，改为比较解析后的可执行文件与精确参数后通过，未重复启动进程。一次观察脚本把事件中字符串 arm 当对象而报错；延迟仍按原 arm 正常触发，原始时间线完整保留，未另造第二轮成功。

当前缺少 GraphQL 时资产页使用通用“查询结果不完整或不兼容，未接纳数据”提示，原因不够具体；功能隔离通过，提示可后续改进。P266-2完成；P266-1的自然1800秒退出实测仍未完成，保持未勾。原98项仍93/98，QA19/22，REL3/5。

## 同期正式发布与回放

[当前41持久水位](./20261011-C266-retained-watermarks-01.json)最低450429，覆盖450430/709570，即63.4793%；这是数据进度，不计作完整查询/WAL验收。[当前发布阶段](./20261011-C266-publisher-phase-01.json)再次确认原发布父子身份、published1006768、pending1482841及锁1，未中断活跃批次。
