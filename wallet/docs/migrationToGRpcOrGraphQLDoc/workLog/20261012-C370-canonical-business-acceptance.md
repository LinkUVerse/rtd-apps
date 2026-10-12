# C370：指定环境业务验收

状态：进行中。仅使用 `dev-canonical-20261012-02`（H0 `zsGbA3wJ85JZ5HFxySu2ayo7mdHzkHwAPnUmoVPKnis`）、固定 HBase3 中间件及本项目归档服务；旧 G3/G4 服务与容器已经停用。

## 已验证

- 普通 Chrome 原生币转账、新增 10 RTD 质押、全部赎回、Display NFT 按名称转移；原生 gRPC 独立复核对应摘要、checkpoint 与所有权。明细见 `canonicalDevAcceptance.md`。
- 非原生币“全部”发送精确显示 `123.456789 WMIG`，摘要 `C7ZqKbCT3a6if7BAsv3oGbxAN64jDmJMMtGiR9ZsPoMB`（checkpoint 2477）。发送账户余额归零，接收账户增加 123456789 最小单位。刷新后进入同一摘要成功回执；此观察不宣称发生了后台执行前中断。
- 三类 Kiosk 共 7 个 NFT：生产查询结果与原生对象版本、摘要、内容、所有者一致；5 个可转移项通过检查开启的模拟，锁定和独占挂牌两项正确拒绝。脚本不签名、不提交。
- C370 普通 Chrome 隐藏及恢复 Display NFT 成功；无 Display 资产入口改为本地详情，隐藏/恢复按钮补全可访问名称。
- PersonalKiosk、Framework 普通与已挂牌资产、OriginByte 已有接收 Kiosk 与新建接收 Kiosk 均完成普通 Chrome 实际转出。包括前述转账/质押/NFT，共 10 笔交易通过原生摘要与 checkpoint 独立复核；归档读取 10 笔回执和 47 项精确版本历史对象全部通过。全部摘要见 `canonicalDevAcceptance.md`。
- checkpoint 3471 的最终资产复核覆盖 3 个账户、9 个目标 NFT，各出现一次且持有路径正确；版本、摘要、内容、所有者与原生对象一致。历史版本界面实显“历史版本已与交易记录核对一致。”首次索引尚未覆盖时的可重试响应保留，不算通过。
- 无 Display NFT 已实际经“其他资产”进入本地详情，属性、所有者与发送入口均可见。
- 全部 13 个本机服务及 13 个目标容器保留数据冷停启动后，H0 不变，11 项真实查询通过。默认 `archive-dev verify` 同样通过。没有宣称主机重启验收。
- C370 针对性 118 项回归、13 项资产界面回归、钱包类型检查、生产构建及产物依赖闭包审核通过。
- 签名、执行协调与恢复门禁 87 项针对性回归通过；三项新增只读验证脚本均实际运行通过且 TypeScript 无诊断。此项不是新环境的 dApp 浏览器签名恢复证明。
- 最新状态核验仍为同一 H0，13 个本机服务、13 个目标容器均运行。

## 修复与运行入口

`prepare_wallet_canonical_release.ts` 与钱包构建器改为绑定运行时不可变身份、genesis 文件、当前 debug 构建证据；正常重启改变 PID 不再使合法构建失效。统一启停器固定各进程/容器身份与实际配置，处理 Docker mount 返回顺序和短暂僵尸进程；3 项守卫测试通过。`archive-dev` 和 `event-services-dev` 指向同一 canonical runtime。

Sui 固定版本 SDL 存入公开测试契约目录 `tests/fixtures/graphql`，避免测试依赖未提交的私有验收资源。原始响应、截图、构建日志和运行参数仍仅保存于私有状态目录。

## 继续事项

dApp 签名执行与恢复、最后完整复核，以及通过后历史临时容器/镜像精确清理。本地工具 `http://127.0.0.1:5181` 的首次钱包站点连接确认已就绪，只选中 dev 账户 `0xbad0…0456`；当时新增连接授权待用户确认；现已获批准并接续 [C371/C372 修复验收](./20261012-C371-C372-dapp-canonical-recovery.md)。此临时工具验收完成后停止，不属于钱包运行依赖。

已准备精确清理清单：33 个已停止的 G3/G4 容器和 12 个未被保留容器引用的历史钱包镜像。尚未执行删除；65 个其余容器及全部数据卷保留。不得使用全局 prune，也不得以旧 H0 的历史结论替代本轮验收。

原始证据存于私有 `canonical-stack-20261012/evidence`：`chrome-ten-native.json`、`chrome-nine-archive.json`、`framework-listed-archive.json`、`final-asset-ownership.json`、`canonical-current-status-C370.json`、`C370-dapp-recovery-focused.log`。Git 仅保存源代码、文档和文字工作日志。
