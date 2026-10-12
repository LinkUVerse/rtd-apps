# NET-07 旧自定义网络空地址的编辑入口修复

2026-10-04。

## 问题与修改

NetworkSelector初始以customRPC选中显示配置表单，但effect又以customRPC && 非空旧URL隐藏表单；旧存储rtd_Env=customRPC、rtd_Env_RPC为空时，用户看不到修复表单，再点击当前自定义网络按钮也直接return。现改为只按customRPC选中状态控制表单，点击已选中自定义网络亦可重新打开表单。没有把旧单URL猜成新多服务配置、填默认端点或主动写入新版存储。

新增selector两项回归，覆盖旧URL为空／非空的可编辑状态、重复点击及切回内置网络。连同NetworkEnv、custom-profile-review、custom form，本轮4文件36项测试通过；wallet完整tsc通过。Local profile03 revision2开发构建成功36451ms，四入口静态审计通过。

## 真实Chrome验证

scripts/test-extension-account-lifecycle.cjs新增互斥的RTD_TEST_CUSTOM_NETWORK模式，禁止与执行／dApp／Local资产模式混用；helper test-custom-network-ui.cjs使用真实UI与chrome.storage／permissions。实际RTD_TEST_LEGACY_NETWORK=1在本次独立临时账户档案写入旧存储夹具后重载：空Fullnode字段可见、版本1、点击当前自定义网络仍可编辑；旧键不变且不存在伪造wallet_network_v2。整浏览器重启后账户保留且锁定，旧网络存储仍原样保留；密码锁定／解锁正常，页面无运行错误，0模拟0提交。20261004-legacy-network-repair-ui.log退出0，customNetworkEvidence完整记录。仅此测试创建的临时目录在结束清理，未触碰任何保留执行档案。

当前UI SHA256 71f5931fd7daa80c7c92ff8683fea773481410151e14f7b8286345bb1498a49d，background仍3a85161e43e83c72be22dc6808dd20feea7b021ad3605c65bf31d7e45263eb10。测试是真实新产物扩展，不称新增权限或实际保存成功。

## 未通过范围

先前同轮尝试完整自定义保存，在chrome.permissions.contains对http://127.0.0.1:39400/*返回false时停止，未预检／保存。保留20261004-custom-network-ui.log失败证据；不能假定manifest的5001端口权限覆盖39400。当前macOS锁屏，未验收原生授权弹窗；没有以mock权限、预写新版profile或绕过预检伪造成功。

因此NET-07仍待真实多服务权限批准、预检保存切换与新版profile重启；本轮只证明旧配置的实际修复入口与保留行为。正常CA、自定义多窗口切网等仍独立待验。Task保持41/98、trial_ready=false。无dev重启、合约部署或链交易。
