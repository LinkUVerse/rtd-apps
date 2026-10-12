# F1c／F2c.2b：当前会话NC5观察与原ticket协调设计

先保留[8份原字节](../evidence/20261005-network-admission-observation-before/manifest.json)及[实施前状态](./20261005-current-state-before-network-admission-observation.md)，本页为编码前选定合同，不计完成。

1. 聚合能力观察由Provider effect独立持有，一session只启动一次；先异步选择受控发布registry再检查会话，以避开StrictMode首次cleanup。普通缓存撤值不取消观察；离开当前session显式取消。读能力视图不持有客户端、不授权签名，未配置时不启动。
2. 发布输入由common webpack DefinePlugin把WALLET_REVIEWED_DEPLOYMENTS原字符串以JSON.stringify编译为固定标识符；运行时模块只捕获该标量，没有网络／profile／UI自动生成pin，没有默认网络回退。未提供保持unreviewed；registry拒绝保持deployment policy负面，不伪造已审核。后台业务使用同审核ABI的F1d仍另待，编译共享输入不能计作完成。
3. NC5按当前配置在一个原生严格事务中占位：配置身份角色（至多4）、GraphQL八域（配置时）及Move十二组。原生begin完成后才进入真实SDK。普通新事实被pending拒绝；每个读取继续自己获取域S，聚合不制造共同S、不更换readSessionKey。
4. createCapabilityFetch持有本次观察的请求计数和保守取消记录，直到聚合完成才封存。请求body／trailers／cancel cleanup未结束、任一叶信号已经取消，均拒绝把wrapper返回当作观察完成；封存后不能追加IO。超时／取消／预算截断不空complete，原ticket保持pending且不设置TTL。明确typed身份负面即使兄弟请求在途也保存，不能由异常名／消息推导Fault。
5. 仅真实正常完成且已通过完整投影／分类的报告可以complete原ticket；仅保留schema／ABI明示负面，临时transport／partial／缺审核声明不变成错链。完成失败不第二次空complete，最终native重检及session／caller fence后才发布有限view。已捕获身份负面优先于稍后取消；Provider从预存只读binding模板生成quarantined，不在已经关闭的session重新构造正面。
6. Provider readCapabilities在checking／storage unavailable／pending或域门槛拒绝时不发布旧正面；本轮保守显示validating或unavailable/policy，域负面不会关闭余额session。身份负面关闭会话且永久撤掉旧视图。独立慢资产查询／余额／metadata／staking读取保持各自scope及proof。
7. 验证实际四族SDK与RTD schema/BCS、原ticket失败／取消竞争、React StrictMode及真正query撤值；memory fixture只证明控制流，原生IDB提交及当前扩展／链上验证不得代称通过。真实发布pin、后台ABI门槛、最终发布原子竞争、所有批准UI及F4当前扩展仍待；父任务不预勾选。

依据[webpack DefinePlugin官方文档](https://webpack.js.org/plugins/define-plugin/)：标识符在编译期替换，字符串值作为代码片段，输入需JSON.stringify带引号。此实现无新增Sui服务协议裁决，沿用双目录既有官方与RTD冻结基线。
