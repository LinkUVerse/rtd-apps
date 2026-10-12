# RPC-03／22 OriginByte 独立配置的读取接入

日期：2026-10-04。

## 发现与修复

现行方案允许 packages.originByte 独立配置发现包与执行包；实际保存的 wallet-profile-20261004-03/profile.json 仅配置该分支。WalletAssetReader.kiosks 原先无条件调用 nativeKiosks，导致缺少原生 OwnerCap 扫描配置时提前失败；useOwnedNFT 也只以 packages.kiosk 判断是否允许读取 Kiosk 持有关系。

组合读取改为按显式配置分别调用原生／OriginByte分支，OriginByte仍按其既定合同核验底层framework Kiosk BCS、动态字段、登记和所有权，不省略结构校验。没有任何分支配置时明确报不可用，不返回空集合。两分支都配置时任一失败仍拒绝组合结果；继续保留同快照末验和重复Kiosk ID拒绝。

NFT持有Hook允许原生或OriginByte任一显式配置启动组合查询。无配置显示未证明错误；对象点查与Kiosk内容的ID、版本、摘要、类型、父对象和BCS一致性检查保留。

## 验证

- 4个定向文件90项测试通过：OriginByte组合入口、无配置拒绝、React持有详情、NFT准备与原生完整快照回归。见20261004-originbyte-optional-routing-tests.log。
- 完整钱包类型检查、dev Webpack、四入口产物静态审计通过。见同前缀typecheck.log、webpack.log、built-audit.json。
- scripts/probe-live-configured-kiosks.ts直接读取已保存profile，不补写原生Kiosk配置，只允许本机GraphQL和GetServiceInfo，无签名／提交。首次在快照复核遇503；查询服务PID和发布循环均仍在运行，未重启或重建环境。
- 后续读取成功返回空集合。记录认证快照25703、目标0xaaa、dispatches=0，非空断言失败，证据20261004-originbyte-only-live.json的passed=false。已知同链非空夹具证据来自旧快照36504；当前水位更低，不把空集合当成夹具／功能验收完成，也不据此推断资产丢失。保留初次失败与重试日志。

RPC-03／22继续未完成，仍需覆盖已部署非空夹具及Chrome详情／交易实测。

## NET-10同时核查

当前完整core typecheck仍有19项错误，见20261004-core-consumer-recheck.log。主要是已不存在的旧rtd-dapp-kit包，以及新版Kiosk Network枚举／FetchKioskOptions的变化。explorer的OwnedObjects仍消费旧item.data.display.data等对象结构；不能仅删除旧objectOptions或强制类型转换来宣称消费者兼容。当前钱包新领域入口与四入口打包独立验证通过，NET-10与整个core构建继续未完成。
