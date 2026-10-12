# 修复版本的独立真实网关回归

目的：当前 C44 的实际币发送点击存在未捕获 Promise；C45 的一行事件处理修复及组件／准备逻辑 44 测试已通过，但不能把尚未准入的 C45 称为当前部署。原 C44 edge、两个链、原发布器和 pending 批次均保持。

另编译 C46，产品源码与 C45 完全相同，仅编译 profile 的三个 loopback 查询入口使用 41957／41958／41959。全新私有回归 gateway 使用当前已验证 nginx image、原同三个 HTTPS 后端和原 CA／只读客户端 mTLS；保留全部 method／body／未知路径规则，仅准入实测 C46 Origin。对本机新端口的监听事先确认不存在。它是独立、临时回归范围；不替换 C44、不修改 C44 或 publisher 的封存 authority，不代表正式升级／普通 Chrome CA 通过。

- V1：精确旧配置／新 profile 差异、原运行来源及端口空闲只读前置；先保存 intent。
- V2：全源码相同的新编译 profile 与构建、全闭包审计、真实 renderer／worker Origin 和五权限。
- V3：仅自有临时 gateway 的配置测试／启动，原 29／14及全部前继保持；真实三入口原帧、错误 Origin／未知路径／Execute 否定规则。
- V4：全新独立 profile 三内部实际最终预览、源映射克隆 GasBudget 故障／新授权／不再出现 pageerror，独立规范 BCS／native／S 审计；零签名／Execute／原 profile 操作。
- V5：原 1015 文件／运行保持；保存自有容器 inspect／logs 后正常 stop 和精确 rm，无 force／卷／镜像删除；最终原环境与 all 98 父范围更新。

V4 不允许更改原批准／响应／journal，不伪造旧 Origin。当前正式覆盖仍必须达到原门槛；该回归只使用实际能覆盖旧 stake 332734 的新鲜窗口，不接受尚未覆盖的新 NFT 424677。完整父验收仍开放。
