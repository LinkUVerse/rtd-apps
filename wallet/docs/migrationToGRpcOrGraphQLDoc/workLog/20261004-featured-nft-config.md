# RPC-23 远程特色NFT配置准入与原交易恢复复核

日期：2026-10-04。

## 编码缺口与修复

buynlarge的useConfig此前仅通过TypeScript泛型把远程JSON当成配置数组。服务返回对象／null时，useGetNFTs与useBuyNLargeAssets的filter会直接抛错；某条错误objectType还可能使整组NFT分类失败。

现以运行时schema逐项验证enabled、对象类型及展示字符串。Move类型复用钱包dynamicType完整解析和SDK结构规范化检查，拒绝畸形后缀／名称别名／非对象类型；根节点非数组返回空特色配置，坏条目不影响其余条目。配置停用只影响特色展示，普通拥有对象读取继续执行。保留原objectType拼写，避免已有首页seen偏好因规范化字符串变化失效；不添加旧JSON-RPC回退。

## 定向证据

- 最终3文件28项测试通过：13项配置／真实feature hook边界、8项NFT领域hook、7项NFT转移表单。`20261004-featured-nft-config-tests-final.log`。
- 首次完整类型检查和构建因GrowthBook的unknown泛型不满足JSONValue失败；改用该库公开JSONValue后通过一轮检查和构建，随后继续加强Move类型准入。初始失败日志保留，不计作通过。

## 最终构建

完整钱包tsc通过：`20261004-featured-nft-config-typecheck-verified.log`。最终开发Webpack成功，35310ms：`20261004-featured-nft-config-build-verified.log`。新产物Provider及四入口AST线协议审计通过，见同前缀`provider-audit.json`、`wire-audit.json`。

当前UI SHA256：6aba589a4317ac759c9b1ce839f525fda0c4f87ebc330f8ab9f6047da8a30251；background SHA256：5498869640f084dfda4cc0773995bdb58c9eb9a821206d67c88fcfa827a36c05。保留profile复核的worker与本次最终background一致。

## 保留交易复核

本轮编码前，使用原staking-execution-browser-01 profile执行只读恢复。首次当前worker热重载遇ERR_BLOCKED_BY_CLIENT，发生于journal读取前，0模拟／0提交。确认进程退出后，以同一profile冷启动重试通过：当前worker与磁盘SHA均为5498869640f084dfda4cc0773995bdb58c9eb9a821206d67c88fcfa827a36c05；币转账AaAKoHj3DgqcwWBvTpPJLjaCwAd2zgoszj1Bu7MKrnSr和质押3AxtK5qS36Vy4wCwpoJqWYGAYJ9crwL2nSKmCFPLaKDi两条confirmed-success保留，账户锁定，0模拟／0提交。

日志`20261004-current-guard-retained-coin.log`和`20261004-current-guard-retained-coin-retry.log`。未重新批准、删除journal或换profile重新发送；这是准备守卫版本的持久终态复核，不是本轮新执行或提交后切网矩阵。

## 最终 Chrome 普通资产回归

实际新UI在认证快照114197读取13个拥有对象，展示10个非视觉对象、Kiosk卡片并进入已准入的空Kiosk详情；导入、密码、锁定、错误密码拒绝、解锁及整浏览器重启全部通过，0模拟／0提交。见 `20261004-featured-nft-config-chrome.log`。

使用一次性只读测试profile与现有dev账户，未绕过保留journal重新执行交易；精确dev证书SPKI例外及编译Local profile，不代表普通CA／自定义host权限验收。远程畸形配置通过真实feature hook定向测试验证，未向外部GrowthBook写配置；Chrome验证普通资产读取未回归，不声称实浏览器远程故障注入。

## 范围

RPC-23仍未完成：NFT完整签名转移及其它未完成页面／实链合同继续归原任务。总体46/98，trial_ready=false。未重启dev、修改源码debug产物或部署合约。
