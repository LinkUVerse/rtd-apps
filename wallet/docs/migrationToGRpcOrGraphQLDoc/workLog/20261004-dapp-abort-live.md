# 真实扩展主动取消六场景

日期：2026-10-04。TX-09／TX-10部分验收推进，任务仍未整体勾选。

## 实测

`20261004-dapp-abort-extension.log`：实际无界面Chromium153.0.8010.12加载当前dist，进程退出0。连接并授权公开测试账户后，直接调用Wallet Standard的signTransaction及signAndExecuteTransaction，各覆盖三种场景：

1. 调用前signal已abort：零批准窗口、零剩余批准记录。
2. toJSON尚未完成时abort，再释放序列化等待：零批准窗口、零剩余批准记录。
3. 打开真实批准窗口且chrome.storage中确认请求存在后abort：窗口关闭、批准记录清空。

六例均返回调用方取消错误，无action-result；没有点击交易批准，没有返回交易签名。全程SimulateTransaction=0、ExecuteTransaction=0，因此本轮不代表模拟进行中或提交后取消的验证。账户导入、密码、后台锁定／错误密码／解锁、完整浏览器重启、正常PersonalMessage验签、错链消息拒绝、错误账户拒绝和断连也通过。

钱包UI读取认证GraphQL快照S70752、测试账户索引余额0；该索引状态不代表Fullnode实时余额。使用已编译Local profile03 revision2和dev精确SPKI例外，未验正常CA或自定义网络权限。

产物UI SHA256 c65a9d2423799816829a1f058c0f2fbcfb5421971640cfef8c229d93aed64cf7；background SHA256 7ff6153da72044c2ff95cea58c81fe89f2b629ee4ee2538b3c6ad9cd243178b8。

## 复现和额外检查

新增`scripts/lib/test-dapp-cancellation.cjs`，由原账户／dApp测试的RTD_TEST_DAPP_CANCEL=1显式启用；demo新增直接Wallet Standard取消控制，Vite产物在/tmp/rtd-wallet-modern-demo-20261004，构建退出0，见20261004-dapp-abort-demo-build.log。

使用RTD_TEST_DAPP_DIR上述目录、RTD_TEST_LOCAL_PROFILE=1、RTD_TEST_DEV_CERT指定既有dev叶证书执行scripts/test-extension-account-lifecycle.cjs，不设RTD_TEST_DAPP_EXECUTE。每次仅使用可清理的无交易临时profile，原执行profile及旧pending从未改动。

最终取消相关5文件33项测试通过：20261004-dapp-abort-final-tests.log。业务代码本轮未改，沿用上一批通过的钱包tsc、构建和四入口审计；demo构建只证明转换打包，不冒充完整demo类型检查。

当前指定rtd源码HEAD、tracked diff与debug rtd/rtd-node哈希全部与已启动环境来源一致，20261004-dapp-abort-debug-recheck.json；没有重新启动链、部署、领币或提交交易。

## 后续

仍须验证正式模拟中取消、签名中取消、提交后取消与原摘要恢复；同时继续modern输入输出和账户事件合同审计。当前进度39/98（39.8%），trial_ready=false。
