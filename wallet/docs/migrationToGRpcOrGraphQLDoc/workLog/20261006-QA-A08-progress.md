# QA-A08 实链模拟错误矩阵进展

当前C24产品代码未变。[真实模拟01](./20261006-QA-A08-current-simulation-01.json)由实际生产 WalletTransactionReader 对原最新debug链执行8案：1原子单位成功与原bytes再模拟、无效地址0IO、批准sender失配0IO、u64最大转账余额不足、gas预算1不足、未知Move函数、实际owned Coin版本0错误，以及修改gas预算后原生BCS与摘要必然改变。共18请求、7次正式checks-enabled模拟，0私钥读取／签名／Execute；完整原响应帧及SHA保存。

[定向测试01](./20261006-QA-A08-targeted-01.log)实际7文件189项通过，覆盖大整数／精度、资金、预算／owner／price／payment替换、模拟失败、批准bytes与后台签名门槛、持久互斥。命令列出的两个不存在匹配文件未产生测试，不写成9文件。当前C24新助记词内部成功发送的4模拟另计，不混入本8案。

原RPC-04实际金额／Max／非法输入及双币执行和原C21赞助／有效期矩阵继续标历史；QA-A05与TRY-02核对完整源码继承。浏览器gas变化需要新的可见批准仍待完整实测，父QA-A08／TX-01保持开放，不能以BCS摘要不同代替该验收。
