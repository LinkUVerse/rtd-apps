# E5/E6 正式私有通道有限验收

正式后台 broker、原生来源校验、content client、最小 gate、消息格式校验与 WindowMessageStream 已编码。当前产品入口尚未接入这些组件，原 dist/C16、原 profile 和七份 journal 保持。不得将本日志当作真实审批、密码学签名或可试用证明。

- [native04](./20261006-private-egress-transport-native-04.json)实际 exit 0、33 项：普通页面、严格 CSP、COOP 的真实 Chrome 配对；正式 typed client/gate/消息流；70 次连续结果交付；旧窗口签名通道、合成事件伪造拒绝；取消及最终原生只读检查。AA== 仅公开无效签名 fixture，链请求、真实签名和 Execute 均为零。
- native01 使用错误连字符标签，类型检查发现后改为实际 rtd_in-page/rtd_content-script；原来源保留。native02 修正后30项通过。native03 在 COOP iframe 5秒定位超时而失败，原因未证实，失败文件保留；native04 后续33项成功不抹除失败。
- 后台 raw client 原生26项、31秒等待与当前 typed transport 分别记录；带调试器的31秒证明不代表生产3小时 worker 常驻。heartbeat 仅供实际 pending 请求，配对握手仍有界。
- 全量首次175文件中2479通过、1项名称 leaf deadline 测试超时：100ms可能在前置读取完成前耗尽，测试随后一直等待未进入的 leaf。保存原测试后，仅 deadline 分支改为 fake setTimeout/clearTimeout，到达 leaf 后推进100ms；[定向复验](./20261006-private-egress-deployment-recheck-02.log)57项通过。实际产品期限没有放宽。

下一步接入实际 producer 前补齐原生上下文动作前屏障、按依赖域检查负面准入、响应大小与原1MiB消息输入合同对齐，再延长真实请求生命周期至 gate 确认，接入真实业务来源与 UI 双门槛。父任务仍58/98、trial_ready=false。
