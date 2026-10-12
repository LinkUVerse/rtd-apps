# NET-07 新版网络配置损坏时拒绝回退

NetworkEnv原先用truthy条件判断wallet_network_v2是否损坏，false／0／空字符串会绕过错误并按旧rtd_Env读取。本轮改为仅null（storage默认缺失值）允许进入旧配置读取；存在的非法非对象值全部报错，数组、字符串和数字也拒绝。没有删除或覆盖损坏记录。

新增6项后台回归：非法新版值即使同时存在旧customRPC URL，也不能返回旧网络；prepareCustomProfile在读取当前绑定时同样拒绝，不发身份预检、不写storage，数据保持原样。

验证：6文件79项网络配置／确认／UI表单／查询缓存测试通过，日志20261004-network-settings-tests.log；完整钱包tsc退出0，日志20261004-network-settings-typecheck.log。新版配置仍需用户明确选择可用网络或检查损坏内容，不静默猜测多服务入口。

NET-07／NET-12尚未完成。本轮未做Chrome真实权限弹窗、storage重启或多窗口切网验收；mock浏览器storage与React表单测试不代替这些验收。

开发版Webpack构建及四入口静态审计通过，日志20261004-network-settings-webpack.log和20261004-network-settings-built-audit.json；未重复全量钱包测试。
