# PersonalMessage 切网迟到签名修复

## 发现与修复

之前普通 PersonalMessage 本地验签路径未监听 NetworkEnv changed；仅 zkLogin 的远端验证阶段监听。用户在消息签名期间切换网络，旧请求仍可能收到签名，与双方交易合同第148行的请求期间切网边界不符。

现在在首次异步账户读取前登记网络／账户／请求取消监听，覆盖初始化等待；所有初始化和签名过程均在同一 try/finally，账户查询失败也清理监听。新增 accountId/requestId 格式长度检查，初次和重验账户 ID 必须匹配。普通密钥仍执行本地真实密码学验签，测试确认不调用 getActiveNetwork 或任何链上查询。

## 验证

新增6个场景：首次账户读取期间切网、签名期间切网、账户读取失败清理监听、同地址不同accountId拒绝、空requestId、超长requestId。连同既有消息／只签名／钱包执行回归共3文件42测试通过，见20261004-personal-message-session-tests.log；钱包完整类型检查通过，见20261004-personal-message-session-typecheck.log。

本轮再次请求测试Chrome时，工具明确返回Mac锁屏，已提示手动解锁；未绕过锁屏、未把单测记作Chrome验证。TX-09/10与TRY仍未整体完成，进度33/98。

开发扩展 webpack 构建及四入口静态审计通过，见20261004-personal-message-session-build.log／-audit.json。本轮未重复全量回归；上一轮108文件1131测试是本次会话边界修改之前的证据。
