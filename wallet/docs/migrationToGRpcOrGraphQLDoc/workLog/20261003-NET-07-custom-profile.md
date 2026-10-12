# NET-07：自定义profile预检、确认与存储接入

日期2026-10-03。沿用双方方案的显式端点／H0／generation与先预检后确认要求。

## 当前代码

新增CustomProfileReviews，最多8份、5分钟有效、一次性消费；预检要求所有配置的原生入口身份匹配。固定已规范化冻结profile，返回副本避免界面篡改后台确认内容。额外账户历史／Faucet的服务边界明确展示，不伪造原生身份结果。

NetworkEnv支持wallet_network_v2，保留旧rtd_Env／rtd_Env_RPC；旧自定义URL仍返回未配置。新增prepare／confirm，确认前检查当前选择、权限及revision；保存串行，成功后才通知。选择epoch阻断“切走再切回”的旧凭据。自定义配置另存wallet_custom_profile_v2，切内置不删除副本。UI旧set-network不可直接保存自定义字段绕过预检。

新增受扩展UI来源检查的消息命令及BackgroundClient接口，redux／UI Provider／后台执行授权／dApp请求绑定统一selectNetworkProfile。Wallet Standard使用自定义显式链标签；公开状态去掉服务地址和部署profile。

旧单URL表单改为配置字段，允许明确省略非Fullnode服务并告知功能限制；合约配置支持JSON输入。用户手势中申请具体origin权限，预检后显示H0／代次／版本，必须点击确认才保存。新增optional_host_permissions；原有内置host权限、CSP仍需后续按部署审计。

官方Chrome权限与match-pattern文档已查询并在双方方案06／05引用。允许运行时请求声明范围内的明确origin，必须在用户手势中请求；不是直接默认授权全部HTTPS站点。

## 证据

custom-profile-review9项、NetworkEnv9项、界面4项共22项定向通过。另新增自定义选择与页面状态脱敏2项。全量78文件852/852通过：20261003-custom-profile-full-tests.log。完整TypeScript检查通过：20261003-custom-profile-typecheck.log。当前开发版构建结果见20261003-custom-profile-build-dev.log。

测试覆盖只预览不落盘、用户确认、权限拒绝／撤销、身份不完整、过期／重放／切网、存储失败不通知、旧URL不转换、同id版本递增、切内置保留自定义副本，以及界面失败不切换redux。受控浏览器API mock不是实际Chrome权限验收。

## 下一步与限制

NET-07不勾选：切回内置后从副本恢复自定义编辑仍需接通；设置页中英文、实际Chrome可选权限／IPv6匹配／worker重启恢复、dApp自定义链标签demo等仍需验证。预检是身份范围，不代表服务schema／package已ready。NET-06／09／ENV／TRY相关要求仍完整保留。

本批未启动dev、未部署合约、无真实链或用户试用证据。当前不可试用，继续profile及剩余接口／恢复主链。
