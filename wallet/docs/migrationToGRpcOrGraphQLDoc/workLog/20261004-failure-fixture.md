# TX-06／RPC-14 真实失败恢复夹具准备与发布

日期：2026-10-04。

## 验收设计与当前边界

现有历史InsufficientGas收据不证明新钱包提交失败后的journal终态。新增仅dev使用的execution_gate夹具：共享Gate初始closed=false、visits=0；visit在开启时成功，关闭时以EClosed=1真实MoveAbort。只有独立部署账户持有的AdminCap可关闭对应Gate。

拟在钱包最终正式模拟成功、持久dispatch-pending已写入后，暂停ExecuteTransaction网络发出，由独立管理账户关闭Gate，再放行原钱包请求。不得修改钱包最终bytes、伪造模拟／effects响应或另发失败候选交易。钱包原摘要应恢复为confirmed-failure，访问计数仍0。**本轮尚未执行这个浏览器竞态阶段。**

## 文件与验证

部署仓库新增：

- localDeploy/wallet-failure-fixture/sources/execution_gate.move。
- prepare_wallet_failure_fixture.py与5项测试：显式本地依赖、源文件摘要、已存在输出／悬空链接保留、错误chain ID／缺少framework拒绝。
- publish_wallet_failure_fixture.mjs：复核当前RTD源码／debug编译证据及每笔既有pending的成功回执；同H0、重新编译、固定bytes正式模拟、fsync pending、一次提交、成功effects验证。
- close_wallet_failure_fixture.mjs：尚未执行。要求30秒内的同H0 dispatch-pending暂停记录；复算钱包bytes摘要、sender、单条visit指令及共享Gate，管理账户必须不同；关闭操作也独立落盘pending并只提交一次。脚本语法检查通过，不标记实链关闭通过。

钱包新增probe-recover-failure-fixture.ts，通过真实WalletExecutionReader／WalletFullnodeReader及GetPackage只读核验恢复、ABI和BCS；tsx实际运行，不声称钱包tsconfig包括scripts。

## 当前源码debug与Move测试

再次核对RTD HEAD、工作区diff、变更文件及debug CLI／node摘要全部匹配既有编译证据，见20261004-failure-fixture-debug-recheck.json。未改Rust源码或重启dev。

使用当前rtd/target/debug/rtd及runtime/config绑定的localnet环境编译测试。3项Move测试通过：open visit成功、close后EClosed失败、正确AdminCap关闭；5项Python准备测试通过。日志20261004-failure-fixture-move-tests.log、prepare-tests.log。保留public entry冗余警告，未影响测试结果。

## 一次发布与只读恢复

- 发布账户：0x11e90d26087af15981c5e7d0739ce58886755f1ac83ebaeb1f7c643b87e5f614。
- H0：3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj。
- 发布digest：5s7B3kFCocq1KiTatNY3bD45Mx6N24fxWPboaGMt8bEf，成功，checkpoint380086，epoch2，发布dispatch=1。
- package：0x6e6a66ba0184d00580ebfe5e3c84a970da64e6f667f71863e0ad132d0b22107d。
- Gate：0xc968537658fb95a1853f78ab7d157cc69b9bc432b34615a20940a36d3446aed3，Shared initial version23。
- AdminCap：0x0e7d115558ad0e16ee2112a1c5081b5264a6e14ca2553469fcd17f73579353dc，AddressOwner为发布账户，内容指向该Gate。

私有构建为runtime/failure-fixture-build-01，发布为runtime/failure-fixture-publication-01；这些目录和pending不得覆盖或重跑。钱包原摘要只读恢复成功，Gate BCS完整往返一致，closed=false、visits=0，ABI字段与visit/close函数核验通过，恢复dispatch=0。公开日志20261004-failure-fixture-publication.log及objects.json/.log。

不复用旧deployer未决账户，不修改profile或查询水位，不将新包未索引解释为缺失；失败竞态依赖Fullnode实际执行而非伪造GraphQL快照。TX-06／RPC-14仍未完成，总体46/98、trial_ready=false。

后续进展：夹具于2026-10-04 20:08完成独立管理账户关闭与真实钱包MoveAbort验证，见[TX-06完成核验](./20261004-TX-06-completion.md)。上文“尚未执行”是该准备阶段记录，当前Gate已closed=true、visits=0；禁止重复发布或重复执行原钱包请求。
