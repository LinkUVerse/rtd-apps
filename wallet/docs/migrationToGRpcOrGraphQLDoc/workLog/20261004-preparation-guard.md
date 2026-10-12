# TX-04：跨窗口 pending 出现后的准备守卫

2026-10-04。发现页面初次恢复为空后会保留可准备状态；另一窗口随后写入pending时，原页面仍可能调用准备器。提交coordinator已有持久pending拦截，但这不足以证明“不重新构建／模拟”。本轮修复准备边界，保留所有现有真实执行journal和dev数据。

## 实现

新增shared/rpc/preparation-guard.ts：在H0／generation／规范sender的同一BrowserExecutionLock内，先检查持久journal，再调用准备／模拟操作；返回前再次检查journal及会话／调用取消。数据库错误、已有pending、已结束的同dApp request、锁占用都不能继续构建。URL／alias／revision不改变锁scope。

WalletRpcProvider的两个配置分支均为prepareTransaction与simulateTransaction接入守卫，覆盖币、NFT、framework／PersonalKiosk／OriginByte、质押／赎回的统一SDK解析和预览模拟。dapp-preparation同样在锁内检查request记录和pending，准备后复核授权，再接原approval registry。不会将页面启动时的一次恢复结果当成后续允许构建的证明。

后台executeWalletPrepared／executeDappPrepared的最终模拟保留在coordinator已持有的锁内，直接调用私有reader；signDappPrepared本来就在同scope锁内检查pending。它们不嵌套新守卫，避免自锁。源码核查所有生产new WalletTransactionReader落点，未发现另一个未受控准备入口。

这是准备／SDK build与模拟边界；不会把只读余额／对象查询误当执行操作。新守卫不清journal、不改终态、不自动重试或重新提交。

## 定向、原生及全量证据

- preparation-guard 7项：已有pending不调用操作、存储错误保守拒绝／释放锁、已有同request终态拒绝、别名共锁、操作后外部pending拒绝、caller／session迟到取消。
- 真实Provider测试新增：第一次准备成功后持久层出现pending，第二次prepare拒绝且fetch数量不增加；原模拟与卸载会话检查保留。dApp测试使用实际WalletReadSession，锁和journal在该单测中为明确替身。
- 3文件70项定向通过。首次11项失败来自旧测试替身缺少signal／assertActive以及jsdom未提供Web Locks；更新替身后通过，初次日志保留。
- 原生Chromium18场景通过，新增真实双窗口Web Locks：准备持锁期间第二窗口更换URL／alias不能准备，也不能取得执行scope锁；释放后第二窗口写入真实IndexedDB pending，原页面再次准备的操作回调0次。它是原生存储／互斥harness，不是新实链pending交易。
- 钱包完整128文件1358项通过；钱包tsc通过；Webpack成功（37298ms）；四入口Provider及旧线协议AST审计通过。初次tsc的闭包类型收窄／测试mock类型错误修正后通过；首次构建用了错误webpack路径而未开始编译，改为实际模块解析路径后成功，日志均保留。

## 新构建实际Chrome

使用原保存Local profile03 revision2，在一次性只读开发账户场景中导入已有deployer，S106970实际余额149998999543361456，页面显示149.99 M。输入1个原子单位自转，完成正常准备并呈现可批准页后返回，4次真实模拟、0次批准点击、0次ExecuteTransaction。未重发任何保留profile中的未知交易。

原生密码设置、锁定、错误密码拒绝、解锁及整个浏览器重启后的账户保留／锁定／解锁通过。精确开发叶证书SPKI与编译Local profile仍是前提，不代表原生host permission／系统CA。此次没有实际NFT／Kiosk转移，也没有把单元／harness的pending夹具当成实链失败。

当前UI SHA fba6cbb31821a204d2b34362f7dd844d39102d4813219cf73be1b9ee6e29c04c，background SHA5498869640f084dfda4cc0773995bdb58c9eb9a821206d67c88fcfa827a36c05；取代此前read-error构建。content-script／dapp-interface不变。

## 状态

TX-04／TX-12继续未完成，实际扩展各入口的完整竞争／故障矩阵仍待；本轮不提前勾选。总体46/98，trial_ready=false。相关日志统一为20261004-preparation-guard-*：tests、initial-tests、native、full-tests、typecheck-final、build-final、provider-audit、wire-audit、coin-preview。
