# TX-01：Epoch完整u64精度修复

2026-10-04。基于上一轮实际失败继续修复SDK源头，而不将界面拒绝当作底层问题已解决。

## 改动

- rtd-ts-sdk/packages/typescript/src/bcs/bcs.ts：Epoch采用u64精确字符串输出，并在输入转换前拒绝不安全number。删除仅供Epoch使用的unsafe_u64。
- transactions/data/v1.ts：Epoch接受JsonU64；旧v1 JSON对安全范围保留number，其余输出十进制string；恢复不再舍入。
- transactions/data/internal.ts：JsonU64的number分支要求安全整数，字符串仍支持完整u64范围。
- .changeset/exact-expiration-epoch.md：公开BCS返回类型改变登记major changeset，未手动修改版本，也未发布。
- 钱包有效期卡片准确显示大Epoch字符串，保留对不安全number及未支持时间戳的批准防护。
- WalletTransactionReader显式expiration比较由JSON文本改为BCS字节比较，避免42和"42"的类型区别误判，同时拒绝实际约束变化。

SDK自身AGENTS的只读基准说明位于fork精简流程；对应REFRESH_2026明确旧仓库仅作为目录基准。本次针对当前已迁移SDK实现进行钱包必要的精度修复，未运行refresh／trim或覆盖旧基准。

## 验证

`epoch-precision.test.ts`以独立DataView little-endian u64编码为oracle，验证0、42、MAX_SAFE_INTEGER及其后两个整数、最大u64。BCS、v1/v2 JSON及Transaction.from/build往返bytes和digest一致；不安全number输入拒绝。

- `20261004-epoch-sdk-full-tests.log`：65文件665项通过。
- `20261004-epoch-sdk-typecheck.log`、`20261004-epoch-sdk-test-typecheck.log`：SDK源码及测试类型检查退出0。
- `20261004-epoch-sdk-build.log`：tsdown实际重建SDK产物成功。
- `20261004-epoch-wallet-full-tests.log`：113文件1232项通过。包括4个新增显式Epoch准备器场景，以及真实BCS批准页夹具和损坏bytes拒绝。
- `20261004-epoch-wallet-typecheck.log`：完整钱包tsc退出0。
- `20261004-epoch-wallet-build-final.log`：最终webpack成功，66354ms。
- `20261004-epoch-wallet-static-audit.json`：最终四入口产物静态审计通过。
- `20261004-epoch-installed-sdk.json`：实际SDK加载路径和声明版本范围核验通过，不等于干净隔离安装。

失败记录保留：初始Valibot直接函数引用导致类型推断unknown（改为显式number回调）；BCS validate阶段已转换bigint，不能识别原输入（改为transform输入阶段）；批准测试夹具缺失bytes；模拟夹具未把修改后的expiration用于最终响应；nullable约束未排除undefined导致类型／旧构建失败。修复后上述最终命令全部通过，旧失败不计为通过。

没有新实链交易、Chrome交互或协议升级部署；现有rtd debug环境未重启。双方技术方案、Task及totalProgress同步。TX-01完整授权边界仍待逐项核验，总体34/98，尚未达到可试用门槛。
