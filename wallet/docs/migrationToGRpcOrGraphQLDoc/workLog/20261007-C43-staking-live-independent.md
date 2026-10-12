# C43 质押表单与真实锁独立验收

当前源码 f489a51f709fbfc1e66f1a55e26f97f6f84c805f4cd64cadb8d857aa5bcddb31，承接草稿保留修复的47项定向测试和当前生产构建／差异／来源审核。

- [x] 实际生产记录 [Chrome01](./20261007-C43-staking-forms-live-lock-chrome-01.json) 自然退出成功：正确validator的质押表单与原332734仓位赎回表单同时ready；真实原sign-only锁下两种Review拒绝，零竞争模拟／签名／派发／journal写入；原锁实际98633ms持有，租约到期失败关闭后锁和签名器恢复。
- [x] 三次正式预览分别质押1、质押2、原仓位赎回；8份实际 ENABLED 模拟原始请求／响应完整；0签名返回／0执行。最后正常重锁、自然关闭，三个journal store保持空且完整一致。
- [x] [独立02](./20261007-C43-staking-forms-live-lock-independent-02.json) 实际通过：1027份原帧、108份独立原生补充帧，5份规范最终 effects、3次真实 kind gas选择，原仓位／系统共享初始版本／gas／实际快照摘要核验。原15份读取body缺失及实际503/504保留，不代表持续可用性。

保留 [独立失败01](./20261007-C43-staking-forms-live-lock-independent-01.json)。原工具把返回的新共享输入枚举 `mutability=2` 当作交易变更；实际请求的旧字段 `mutable=true` 等价。按 [Sui官方 Input](https://mystenlabs.github.io/sui/sui_rpc_api/proto/sui/rpc/v2/struct.Input.html) 与 [官方枚举](https://mystenlabs.github.io/sui/sui_rpc_api/proto/sui/rpc/v2/input/enum.Mutability.html)，旧bool继续作为输入被尊重，新字段用于兼容新增非排他写。对应本地 SDK `src/grpc/proto/rtd/rpc/v2/input.ts` 的字段6／7及枚举0／1／2／3。

新独立v2仅在明确共享输入且旧bool存在时补其唯一等价枚举：true→2、false→1；已有枚举必须一致。其余字段全部精确比较。对原三份实际响应各变异bool、未知0、非排他3、初始version、objectId和commands共18次阴性检查，全部拒绝。没有删除字段、放宽对象版本、重跑生产或把kind选择声称为完整规范effects。

父 TX-01／TX-04 未勾选；冷持久pending、全表单与全NFT矩阵、持续503/504根因和普通Chrome开发CA仍开放。后续先执行 [C43 原回执读取](./20261007-C43-staking-indexed-receipt-design.md)，再执行已拆解的 [新 C43 pending与冷恢复](./20261007-C43-staking-pending-design.md)。
