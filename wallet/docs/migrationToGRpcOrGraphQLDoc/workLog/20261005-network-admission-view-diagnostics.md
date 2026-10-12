# CAP6 F1a–b首次诊断与范围

本批所有失败均保留，最终结论只按[最终检查](./20261005-network-admission-view-checks-final-01.json)与[完整日志](./20261005-network-admission-view.md)。

1. 初次读取使用了不存在的`move-contract-capabilities.ts`和文档根`current-state.md`路径。重新执行`rg --files`后按实际`move-package-capabilities.ts`与`workLog/current-state.md`读取；不存在路径的读取不算通过，也没有按猜测新增替代文件。
2. 两次`apply_patch`因格式化后实际行与预期锚不一致拒绝，均未改动文件；读取当前精确行后小块修正。拒绝不记成实施完成。
3. [首轮定向](./20261005-network-admission-view-tests-01.log)63项通过，但[RPC类型01](./20261005-network-admission-view-types-rpc-01.log)有10条测试夹具直接赋值／删除readonly字段诊断。使用`Object.assign`显式故障注入及可变`WalletNetworkProfile`夹具，不放宽生产readonly类型。
4. 增加封闭状态投影检查后，[定向02](./20261005-network-admission-view-targeted-02.log)152/153：唯一失败为package-id反例错误假设未审核部署已有pin包条目，`Object.assign(undefined)`在调用被测代码前失败；改为在可变夹具中显式注入一条非法包记录。该失败不作为生产拒绝证明。
5. [RPC类型02](./20261005-network-admission-view-types-rpc-02.log)与[钱包类型02](./20261005-network-admission-view-types-wallet-02.log)各5条生产投影返回类型诊断：泛型检查函数从可用枚举数组推导成`string`。修正为从值保留`const T`、候选数组只作为运行时检查；不使用any或宽化公共类型。最终两类检查实际退出0。

最终75个新增场景／四文件153项和157文件2151项完整回归通过；前述63项属于中间源码，不代替最终证明。测试release pin来自明确标记的合成fixture，不是独立真实部署签认。未产生新的网络请求、模拟、签名或Execute；Provider／后台接入、严格持久隔离与旧值撤除仍待。
