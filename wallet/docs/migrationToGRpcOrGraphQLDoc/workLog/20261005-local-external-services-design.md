# TRY-06／NET-06：本地包外部服务显式边界

前置证据为[实际当前扩展诊断](./20261005-transient-capability-observation-diagnostic-01.json)：默认启动访问apps-backend.rtd.io并跳转sedo.com，Amplitude也有配置和事件请求。保持真实链端点、密钥、journal、native未知行及业务授权合同；不通过测试拦截隐藏产品请求。

实施：编译常量明确启用外部附加服务，只有production且构建显式WALLET_EXTERNAL_SERVICES=true才启用，默认及local构建关闭。关闭时feature加载使用已有空配置和原有默认值，不调用远端loadFeatures；Analytics不初始化远端client、不注册发送生命周期，URL不附deviceId，退出不依赖未初始化client。Sentry同时关闭。远端功能开关不能作为交易、网络准入或动态package权威。

先保存全部编辑前字节。定向测试实际feature loader／analytics关闭分支及显式production配置；完整类型和钱包回归，新构建保留C11，fresh Chrome实际UI／worker源码匹配及请求origin复核。闭网默认值不证明远端功能可用，旧profile未知pending不清除；全业务动态抓包与全部98任务仍继续。
