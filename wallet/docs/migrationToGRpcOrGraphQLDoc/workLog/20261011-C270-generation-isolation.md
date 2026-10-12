# C270：当前普通 Chrome 配置代次与隐藏记录隔离

## 结果

当前 C257 / 独立 C51 普通 Chrome 已完成同 H0、同服务 URL 的客户端 generation 切换、刷新持久化、隐藏记录隔离和原配置恢复。P270-1/2完成，QA-A17的整套后端换代、完整数据/WAL及其他生命周期合同仍开放；原98项仍93/98。

[资格核验](./20261011-C270-qualification-01.json)对应[原生UI时间线](./20261011-C270-native-ui-03.json)、[完整导出HAR](./20261011-C270-generation-isolation-01.har)和[生产reader核验](./20261011-C270-network-audit-03.json)。106个当前RPC模块与实际安装C257源码映射一致，全程无新交易。

## 实际操作

1. 保存原 `c51-tls-acceptance` 网络全部字段、packages及两项NFT基线。原已保存revision=1，表单显示下次revision=2。
2. 首轮只改变客户端generation为 `c270-generation-mismatch`；链身份预检通过，资产重新读取成功。
3. 同id尝试回退revision=1被明确拒绝“修改现有网络时必须增加配置版本”。该失败保留。随后使用临时配置id `c270-generation-isolation`、原generation和revision=1，服务地址及其他字段不变。
4. 在原generation将 `Migration Display V2` 隐藏，隐藏列表可见该NFT。随后在同一临时id下仅改变generation，revision按表单递增；新代次隐藏列表为空，可视化资产显示该NFT。刷新页面后仍显示，且HAR有新准入、固定快照、资产读取及读后检查。
5. 切回原配置id、generation及revision=1，全部字段和packages与基线一致。原代次隐藏列表仍保留该NFT；实际点击恢复后隐藏列表为空，两项NFT正常显示。首页149.99 M RTD，3270/9d76/d50b/bad0四账户保持，最终停留正常首页。

这里只改变钱包客户端配置，没有重建、切换或伪造后端generation。

## 更正测试预期

开始时预设“客户端generation字符串不等于Display历史代次就应拒绝读取”不正确。当前实现中，客户端generation与H0组合隔离缓存、会话、journal和隐藏偏好；Display历史source/generation属于服务自己的历史覆盖证明，按一次读取内的稳定性核验，不要求与客户端配置字符串相等。真实读取成功与源码一致，未据错误预期改动产品。

依据：[WalletRpcProvider的偏好scope](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/shared/rpc/WalletRpcProvider.ts:421)、[隐藏记录的作用域与持久提交](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/pages/home/hidden-assets/HiddenAssetsProvider.tsx:21)、[Display历史证明](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/shared/rpc/display-history.ts)、[网络revision保护](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/background/NetworkEnv.ts:121)。

## 请求与异常范围

导出的190项全部计入：158 GraphQL（157成功、1导航取消）、26 GetServiceInfo、3 ListBalances、3 PNG。生产资产reader重放37次读取操作，其中36成功、1真实AbortError被拒绝；包括3次新generation下的读取。其余GraphQL是身份预检、首页准入/元数据等18帧，单独做正文结构核对，不冒称生产reader完整验收；29原生帧完成protobuf及grpc-status解码，3图片验证PNG签名。

两次离线审核脚本错误保留：首次误将字符串checkpoint与数字严格比较，第二次误用protobuf对象不存在的toJson；修正审核脚本后第三次通过，未重新生成浏览器帧。初次隐藏按钮坐标/过期toast点击未成功的中间观察也保留。离线回放不重演原异步调度，不把长时间页面轮询计为单次刷新请求数。

## 同期依赖

[发布阶段只读观察](./20261011-C270-publisher-phase-02.json)：原父22156/子78607保持，已完成1006769个旧提交对象复核；13:00 UTC时发布头仍1006768，pending1482841，不能把旧对象复核完成视为新批次发布完成。正式发布未被中断。

C266隔离入口的[自然退出补验](./20261011-C266-natural-autoexit-qualification-01.json)已实际通过：1800.131秒自行退出，PID18752及42970端口已释放；未向其发送终止信号，没有修改业务路由。此自然退出时没有在途请求，不扩大为所有关闭竞态验收。
