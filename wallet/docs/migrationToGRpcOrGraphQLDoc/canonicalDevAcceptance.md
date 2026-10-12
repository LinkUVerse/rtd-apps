# 固定中间件组与指定创世地址的完整验收

更新时间：2026-10-13。状态：本次约定的本地与链上功能已完整验收，历史资源已清理。

最终结论及边界见 [C375 完整验收](./workLog/20261013-C375-canonical-completion-and-cleanup.md)。以下首次发现和分轮记录保留当时状态，不代表当前未完成。

## 范围与通过条件

用户确认只验收本地钱包与链上功能：账户、余额、转账、质押、NFT（含 Kiosk）、名称、历史、dApp 签名授权及持久恢复。兑换、zkLogin、Qredo、Ledger 硬件、法币等外部依赖入口继续明确标注不可用，不计作本次本地环境可用功能。

最终依赖必须收敛为本仓库钱包、当前 `rtd/target/debug` 产物启动的 dev 链、`rtd-archive-service` 的子服务及配套工具、`rtd-archive-events-hbase3` 中间件组。部署与合约操作入口归属 `link-u-smart-contract/all-in-one-deploy/localDeploy`。

创世全部账户 Gas 及创世质押凭证必须仅归属 `0xc535a846ad8aecf2c353c12b557612f0f1ae3bb09ba7cd2c6c8fa6fa56bf0df9`。已有显式 `accounts` 配置是 5,200,000,000,000,000 MIST（5,200,000 RTD）；swarm builder 还为每个验证者额外分配 30,000,000 RTD Gas 和 20,000,000 RTD 质押。修复将额外分配的所有权也交给指定地址，保持初始金额和共识质押量不变。单验证者预计该地址可用余额为 35,200,000 RTD，另持有 20,000,000 RTD 的质押凭证。协议系统储备仍属于系统，不能误称为个人可用余额。测试账户由该地址在创世后转账供给，不额外分配创世水龙头账户。

## 首次实测发现

1. 普通 Chrome 的 C362 钱包实际使用 G4：H0 `BTrU3deMDbnWcUWLJ2ruDj9vbCC4gaYnVj8qV3K2nFah`，fullnode 43150，GraphQL 43210，archive 43203，account 43211，网络修订 5。首页当时显示 100 RTD。它没有连接固定容器组的查询服务。
2. G4 有单独的 PostgreSQL、MinIO、ZooKeeper、HBase 及其他归档入口，共 13 个容器；G3 链及相应查询环境仍存活。不能以当前钱包可读余额证明固定组足够。
3. 固定组共 24 个历史容器，只有 6 个中间件容器健康运行；其余 18 个查询、索引、备份和监控容器停止。历史配置与不同链的索引不可直接混用。
4. 原钱包 dev 初始化入口默认执行 `genesis --with-faucet`，生成随机测试账户及额外水龙头账户，没有使用部署仓库的指定地址配置。需要修正初始化入口，并对实际 H0 和创世分配复验。
5. 指定地址的现有本地签名账户可用；本次只查询了公开地址，没有将密钥写入验收文档。
6. 固定组名称不被通用 foundation 初始化器接受；现有工作区还严格绑定私有配置及数据卷。需要显式支持固定组和新一代隔离存储，不能直接改旧 manifest 或覆盖旧链数据。
7. 首次新链原生 gRPC 查询揭示：仅修改 `accounts` 并去掉水龙头仍不够，实际创世存在随机验证者持有的 30,000,000 RTD Gas 与质押凭证。此轮新链已停止并保留反例，未接入归档。`rtd-swarm-config` 的自动验证者分配行为也见 [Sui 官方同源 builder](https://github.com/MystenLabs/sui/blob/main/crates/sui-swarm-config/src/network_config_builder.rs)。现补充显式 `validator_token_recipient` 配置；未设置时保留上游默认行为。

因此，首次调查时的部署不满足目标组合。以前的 98/98 迁移任务结果保留其原验收范围，不作为本次部署收敛通过的证据。

## 实施与验收清单

- [x] 明确本地与链上验收范围，排除外部服务入口。
- [x] 实查 Chrome 网络配置、链与 Docker 依赖，记录当前不满足项。
- [x] 重新核验当前源码 debug 构建，保存可复现构建记录。
- [x] 初始化指定地址唯一创世账户分配的新 dev 链；核验实际 H0、协议版本、余额及 checkpoint 推进。
- [x] 固定中间件组采用隔离的新一代存储，保留旧卷与回退资料；通过真实存储读写及健康检查。
- [x] 接通原生认证发布、归档 Ledger、SQL/consistent 索引、GraphQL、账户索引与查询、浏览器网关。
- [x] 部署并校验本地名称、NFT、PersonalKiosk/OriginByte 等合约与网络绑定。
- [x] 钱包生产产物连接该环境，完成账户、余额、转账、质押、NFT、名称、历史、dApp 签名恢复的实际验收。
- [x] 只运行目标环境完成整套停机恢复及真实查询核验（主机重启本身未模拟）。
- [x] 成功后清理历史 RTD/wallet 临时容器，核对无关容器组完全保留。

## 证据管理

源码、说明和文字工作日志可提交。原始 Docker 快照、构建日志、查询原始响应、浏览器截图等放在私有运行目录 `~/.local/state/rtd-wallet-migration/canonical-stack-20261012/evidence`，不提交 Git。禁止将账户密码、私钥和中间件凭据写入文档。

## 本次已取得结果

新链 `dev-canonical-20261012-02` 使用当前源码八项 debug 构建（包含创世分配修复），H0 为 `zsGbA3wJ85JZ5HFxySu2ayo7mdHzkHwAPnUmoVPKnis`，原生入口 `http://127.0.0.1:43350`。原生 gRPC 逐对象证明：两个 Gas 对象合计 35,200,000 RTD、一个创世质押凭证全部归属指定地址；协议 139，30 秒观察 checkpoint 从 3 推进到 20。此结果仅证明主链和创世分配，尚未证明归档或 Chrome 完整可用。

修复验证：2 项真实 Rust 创世测试、9 项部署/HTTP 连接复用测试、7 项 foundation 隔离测试通过。旧固定组 24 个容器已受控退役以替换配置，全部 16 个原数据卷和恢复 Compose 保留，无其他项目容器删除；新固定组 6 项基础中间件已健康；真实 PostgreSQL 连接、14 项 HBase 表及网关读写检查通过。HBase 的 TLS 基础镜像通过受控升级修复，旧卷未删除。认证暂存 0–20 的 21 个 checkpoint（1017 笔交易）通过原生证书与固定版本读回检查，并已发布至新存储；这仍不代表查询或 Chrome 可用。G3/G4 尚未清理，待替代环境完整通过后处理。

### C368/C369：真实查询、首笔转账和独立运行

已完成全部查询链路及 9 项本地合约部署。生产钱包 C368 使用新 H0、修订 6 与新合约绑定，7 个实际 JS 块的依赖闭包审核通过。普通 Chrome 切换至该版本的本地网络后显示 1,000 RTD；由现有 dev 账户发送 1 RTD，摘要 `7NggU9WDwX7JoDkbZmuvwdupQU273jvMG7QM34BQkCnK`，原生 gRPC 证明 checkpoint 862 成功，实际费用 0.00199788 RTD。刷新成功回执可恢复原交易，没有重新提交。

首次发送期间出现元数据同步失败提示，最终自动进入成功回执。已定位到查询入口间歇性 503，包括 Docker 网关向本机准入服务建立连接超时。入口已改为连接复用，每次仍执行独立准入检查；不缓存准入成功结果，不改变 TLS、权限或发布水位。转账预览修复保留与已批准 bytes 绑定的金额、精度、账户、标签，不再重新依赖实时元数据；提交校验保持独立。C369 的 66 项针对性回归、钱包类型检查、完整生产构建及实际产物闭包审核通过，浏览器升级后的验收仍待进行。

旧 G3/G4 的 29 项常驻服务已按精确进程身份发送 TERM，33 个运行容器停止，未删除容器、镜像、数据卷或账户。新链和查询不依赖这些旧服务。仅新环境下，原生余额、三轮 GraphQL 余额、正反向名称、过期名称拒绝、Display 资产、质押读取、历史、原交易回执共 11 项全部通过。三轮余额各约 1.1 秒，历史约 6 秒；入口连续 12 次 GraphQL 全部成功，约 0.27–0.37 秒。此结果证明查询和一笔转账，不替代质押、NFT、dApp 以及冷启动的全部验收。

私有证据：`wallet-readers-keepalive-03.json`、`keepalive-samples.json`、`chrome-first-transfer-native.json`、`old-runtime-stop.json`、`wallet-production-C369-build.json`、`wallet-production-C369-closure.json`。原始反例也保留，包括停旧环境附近的短暂连接失败；未将失败轮次记为通过。

### C369/C370：质押、NFT 转移和整套恢复

普通 Chrome 在新链完成 10 RTD 新增质押（`BiC2R5gSSoNUaqyndYupvkCt49NEPSoacqbvL63uyHb6`，checkpoint 1325）、全部赎回（`RsaigUbmn7gG3Z3ixT6jmbhRzp5thFJ5nRbzzYAhdBr`，checkpoint 1376）。Display NFT 按 `wallet-migration.rtd` 转移至 `0xbad0…0456`，摘要 `As7Nu29sXYY1myiKQ7XgStfQ3Kg36EP3fqZeFprQycKq`，checkpoint 2076；原生 gRPC 独立核验成功及最终 NFT 所有者，发送账户列表由两个资产变为一个。

通过统一入口停止全部 13 个本机服务与 13 个目标容器，再保留原数据启动。13 个本机服务均存活，7 个有健康探针的容器均健康，H0 保持不变；原生余额、三轮余额、正反向/过期名称、Display、质押、历史、回执 11 项恢复后全部通过。普通 Chrome 刷新资产页仍正确显示转移后保留的 NFT。这里的 13 个容器包括固定组 6 个基础中间件和 7 个归档服务/入口容器；没有依赖 G3/G4 的数据库或主链。未宣称完成主机重启或所有业务写入恢复。

`archive-dev` 与 `event-services-dev` 已绑定同一个私有 canonical runtime；常规 `up/down/status/preflight/verify` 不会误用历史 frozen Compose。启停器在发送信号前核对 PID 与启动命令，核对容器 ID、镜像、配置、挂载、端口，保留数据且禁止强制杀进程。实测修正 Docker 挂载返回顺序不稳定及短暂僵尸进程误判；3 项相应守卫测试通过。

C370 修复无 Display 资产只能跳外部浏览器的问题，改为本地详情入口；补充隐藏/恢复按钮名称及键盘焦点可见性。118 项针对性回归、钱包类型检查、完整构建与依赖闭包审核通过，已在独立 C51 Chrome 原路径升级，账户、权限和扩展 ID 保留，C369 完整备份保留。公开 Sui SDL 测试契约移至 `tests/fixtures/graphql`，修正测试依赖未提交验收资源的问题；它是固定上游源码，不是原始测试响应。

证据：`chrome-stake-withdraw-nft-native.json`、`canonical-cold-stop-02.json`、`canonical-cold-start.json`、`canonical-cold-status.json`、`wallet-readers-cold-start.json`、`wallet-production-C370-build.json`、`wallet-production-C370-closure.json`、`C370-focused-tests-02.log`。服务存在不等于全部业务通过；Kiosk、非原生币、dApp 签名恢复和旧容器清理继续实施。

### C370：非原生币与全部 Kiosk 类型

普通 Chrome 完成非原生币全部发送 `123.456789 WMIG`，发送账户余额归零，接收方增加 123456789 最小单位；刷新恢复同一摘要回执。隐藏/恢复 Display 资产、无 Display 资产经“其他资产”进入本地详情并显示属性与发送入口，均已实测。

新增实际转出结果（均为本地 dev 测试资产）：

| 分支 | 交易摘要 | checkpoint |
| --- | --- | --- |
| 非原生币全部 | `C7ZqKbCT3a6if7BAsv3oGbxAN64jDmJMMtGiR9ZsPoMB` | 2477 |
| PersonalKiosk | `4edQ83MSaaU829T6whiUC6GZEFNkK2s9vca42CH4gqMY` | 2861 |
| Framework Kiosk | `7j2SWNVuEVZF3apxKxfQWD1Ps5JfXYs9iatX4zHWSYU5` | 3018 |
| OriginByte 已有接收 Kiosk | `8wPALdc1WkSCnsYNEtQFutkR9mYjo8BLYytEW83DQ25C` | 3152 |
| OriginByte 新建接收 Kiosk | `UdG24SGHavQDcesRPRAP1T1o4mqhASkUpke2bpHNp5A` | 3317 |
| Framework Kiosk 已挂牌资产取出转移 | `EU7AJorUcZ79nUpPVxnFzJffxcDtXK54aYFGXdD72vJk` | 3466 |

上述与先前转账/质押/NFT 共 10 笔 Chrome 交易，通过原生链独立查证；包含 NFT 最终持有路径和新建 OwnerToken 的接收地址。实际归档读取 10 笔回执及 47 项写出历史对象，版本和对象摘要全部与原生 effects 精确匹配，没有模拟或再提交。checkpoint 3471 的最终资产复核覆盖 3 个账户、9 个目标 NFT，列表恰好出现一次且持有路径正确，原生对象版本、摘要、内容及所有者均一致。Kiosk 预览额外覆盖锁定、独占挂牌两个明确拒绝分支。

历史对象界面首次在归档尚未覆盖时返回可重试提示，此失败没有算作成功；后续真实归档已覆盖并核验该版本，普通 Chrome 实际显示“历史版本已与交易记录核对一致。”无 Display NFT 本地详情也已在浏览器显示属性、所有者及发送入口。

私有证据：`chrome-ten-native.json`、`chrome-nine-archive.json`、`framework-listed-archive.json`、`final-asset-ownership.json`、`canonical-kiosk-previews.json`。三项新增只读复核脚本通过实际运行和生产 TypeScript 类型检查。签名/执行/持久恢复另有 87 项针对性回归通过，但这些测试不代替本轮新环境的 dApp 实际连接与签名恢复验收。

最新状态复核：同一 H0 下 13 个本机服务、13 个目标容器均运行，证据为 `canonical-current-status-C370.json`。原始 Chrome 签名提交、只读原生复核、归档复核与冷启动证据分别保留，不混为同一种验证。

当前待办：普通 Chrome 的 dApp 恢复复验、后续完整检查与历史环境清理。`http://127.0.0.1:5181` 新授权已获用户批准，消息/仅签名和多项拒绝分支已通过；实际自转账成功后刷新暴露恢复时序及原授权复用缺陷，C371/C372 已修复，后者浏览器复验继续。详见 [dApp 实测与修复](./workLog/20261012-C371-C372-dapp-canonical-recovery.md)。清理计划已核对 33 个已停止的 G3/G4 容器、12 个不被保留容器引用的历史钱包镜像；尚未执行删除，65 个其余容器和全部数据卷均保留。准确容器数以原始停止清单及本次复核为准，已纠正此前文字中的 34 处误记。

## C373–C375 最终收口

全部上述清单已完成。dApp 正常执行与超过 30 秒的原结果恢复通过；修复账户历史认证 Cap 索引复用与准入配置后，完整 19 条历史从 163.68 秒降至 3.40 秒且响应逐字段相同。清理 33 个历史容器和 12 个临时镜像，65 个其余容器及全部数据卷保持。清理后 11 项真实读取再次通过，Chrome 首页余额正常。详见 [恢复实测](./workLog/20261012-C371-C372-dapp-canonical-recovery.md)、[历史性能](./workLog/20261013-C374-canonical-history-performance.md)、[最终范围与清理](./workLog/20261013-C375-canonical-completion-and-cleanup.md)。
