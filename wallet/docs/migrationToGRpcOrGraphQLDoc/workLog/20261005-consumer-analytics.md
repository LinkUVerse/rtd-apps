# NET-10：统计消费者与完整构建收口

按[实施前设计](./20261005-consumer-analytics-design.md)与7份[原字节](../evidence/20261005-consumer-analytics-before/manifest.json)推进。原7条Explorer类型错误已消除，不为SDK补不存在的方法／类型。Accounts与Popular Packages显式不可用，不返回零、空图或无限loading，不发未部署统计请求；原展示表格仅有本地presentation tuple。Checkpoint独立使用SDK既有getLatestCheckpointSequenceNumber，0和超过2^53的整数均准确呈现，失败显示不可用。

[38项完整Explorer测试](./20261005-consumer-analytics-tests-02.log)实际退出0，其中6新项覆盖不发IO／不使用旧正缓存、不可用而非空历史／榜单、真实SDK checkpoint方法、0／大整数与503。已有happy-dom AppReadyEvent警告仍保留，不能当真实扩展发现验收。[完整生产构建02](./20261005-consumer-analytics-build-02.log)实际0，完整tsc及2852模块Vite5.67秒通过；[root core完整类型](./20261005-consumer-analytics-core-types-01.log)实际0。第一次构建仅新增测试fetch变量同名类型错误，原失败和测试字节保留后改名；不是掩盖产品类型诊断。

[真实编译页面启动02](./20261005-consumer-analytics-browser-02.json)通过：实际Chromium153加载production入口、home及真实SDK参考gas fixture呈现，0页面错误，未部署统计请求0；外部2请求被阻止，实链0。Home当前统计card未启用，组件证明与浏览器启动分开。首次runner未明确已有Chromium executable而失败，原runner／日志保留。该浏览器结果不冒充真实Explorer数据、钱包CA或核心试用。

[最终来源及范围](./20261005-consumer-analytics-checks-final-01.json)记录10来源、完整日志与失败SHA。workspace已明确排除旧nested core；实际钱包依赖root core、Explorertyped Provider／显式JSON-RPC独立consumer和UI／icons由完整消费者构建覆盖。钱包1076产品源码／SDK／配置／锁仍与当前C10构建SHA90799353一致，[逐文件产物](./20261005-current-extension-network-admission-artifacts-01.json)另证。此前NET-08／09及consumer explicit／Kiosk／Kit边界证据保持；本批完成NET-10消费者迁移影响和构建合同，统计服务未启用不虚构功能可用。当前钱包只签名／native pending、normal CA、所有业务真实回归另由原任务推进。
