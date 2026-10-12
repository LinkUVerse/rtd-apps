# 当前 C43 Chrome 气费变化后拒绝旧批准

承接333000区间S6的当前Chrome缺口，TX-01限定故障子合同。原W1 Node气费变异不当作Chrome结果，当前M4已通过不当作此故障通过。

- [x] G1：沿用当前C43 M4自有空journal profile，只读冷打开／正常解锁；当前UI／worker、原受控owner／原332734仓位和新鲜环境有效。原执行及所有pending profile不打开。
- [x] G2：正确validator质押1RTD与原332734赎回分别实际Review，记录当前可见批准和完整kind／final模拟。通过当前真实UI点击“立即质押／解除质押”进入生产revalidateStaking。
- [x] G3：以实际加载JS／完整source map／本地源码精确定位生产参数，在模拟调用前仅把本次参数克隆的bytes替换为规范gas budget+1000的bytes；旧digest及可见批准保持，函数／响应／journal／锁不替换。恢复执行后必须看到真实ENABLED模拟、规范变更bytes／新摘要与成功effects，然后生产页面明确“原批准交易模拟未通过，请重新预览并授权”。两个分支均零VerifySignature／Execute及journal变化。
- [x] G4：独立审核源码／产物、断点原映射和原参数、两个实际批准／错误、六原模拟帧、唯一gas差异、规范BCS／effects及原生原仓位／gas保持；正常Back／重锁／Chrome退出。原503/504与缺失读取body保留，不能认持续可用。

这是明确的批准参数故障注入，不是用户可以在表单编辑gas的产品功能，不声称原生gas市场价格发生变化。Debugger只能改变本次函数参数的克隆值，禁止改原批准对象／函数实现、链响应、应用缓存、IndexedDB或任何原pending；发生意外验签／执行请求立即截断且整次失败。该空profile仅用于本计划，结束后正常锁定／关闭，不复制任何历史profile。

实际 [Chrome01](./20261007-C43-staking-stale-gas-chrome-01.json) 七项／两分支和 [独立01](./20261007-C43-staking-stale-gas-independent-01.json) 均通过：质押3419224→3420224、赎回2000000→2001000；规范交易数据仅此budget差异。6份原ENABLED模拟完整、4份最终规范effects和2次kind费用选择精确核验，原可见摘要保持，新摘要来自真实Fullnode；实际生产函数与957.js完整source map／本地源码一致，克隆参数故障后两个真实按钮均触发明确旧摘要拒绝。S351765／typed摘要、原332734仓位与gas对象9份原生补充核验成立。0验签／Execute请求、全三store与密文、正常Back／重锁／Chrome关闭保持。原一份GetServiceInfo关闭body缺失和一份GraphQL503完整body保留，不认持续可用。
