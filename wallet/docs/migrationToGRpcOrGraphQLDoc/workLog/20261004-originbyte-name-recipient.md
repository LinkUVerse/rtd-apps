# OriginByte名称收款批准参数校验

## 实现

新增approved-recipient.ts并由background executeWalletPrepared调用。原TransferObjects参数核验保留；OriginByte仅接受profile.originByte.executionPackage下ob_kiosk模块两种明确P2P方法，限制一个类型参数、三个显式参数、单条命令、源共享可变对象及精确ID BCS。包含额外TransferObjects的混合P2P交易也拒绝，不能借它绕过检查。

- p2p_transfer_and_create_target_kiosk：第二个Input必须为与名称解析目标一致的32字节Pure地址。
- p2p_transfer：第二个Input必须为与源不同的共享可变对象。后台通过WalletFullnodeReader.object重新读取，核对对象ID、0x2::kiosk::Kiosk类型、Shared初始版本；精确解码BCS，检查内部UID、owner为最终名称目标、allow_extensions=true。错误或缺失不允许继续。

这一步验证名称对应的实际收款目标，不替代正式模拟的源权限、扩展登记和NFT类型规则。仍固定原bytes，不重建、重签或发送替代交易；目标读取等待也受上一批后台授权期限约束。

## ABI来源

本地link-u-smart-contract/all-in-one-deploy/localDeploy/build_wallet_fixture_p2p.mjs与prepare_originbyte_wallet_fixture.py定义固定版本受控部署和ABI探测。实际部署构建目录originbyte-rtd-build-06/kiosk/sources/kiosk/ob_kiosk.move第473和506行两种entry签名已核对。

固定[OriginByte源码](https://raw.githubusercontent.com/Origin-Byte/nft-protocol/e8e8efd77ab15d7b2cf30958fd748dbb3afbdaab/contracts/kiosk/sources/kiosk/ob_kiosk.move)本轮在线读取成功，与本地RTD转换源码参数一致。初次遗漏sources/kiosk层级的URL返回404，未作为依据。

## 验证与限制

17项新参数测试，加后台执行14项与NFT准备42项，共73项定向通过；覆盖正确两种目标、owner／扩展／UID／类型／共享版本变化、缺失／读取错误、错包／模块／方法／参数数量／类型参数及混合调用、未使用Pure地址不能充当收款证明。钱包完整tsc通过。

仍需补真实background命令到两种OriginByte交易bytes的集成用例和同链名称服务部署／Chrome。RPC-21保持打开，不能仅凭辅助函数单测重新标记全部完成。此轮没有签名或提交实链交易。

最终修改后全量100文件1086项通过，dev Webpack构建和四入口静态审计通过，日志前缀20261004-originbyte-recipient；这些结果不代替尚未执行的后台OriginByte命令集成／Chrome。
