# TRY-02 新建及导入账户核心链路完成

[勾选前审核02](./20261006-TRY-02-completion-audit-02.json)通过。当前 C24 源码 839da1f5…／1110 文件及隔离 production04 保持；1151 份完整产品／验证输入和本批六份完整相对路径工具另存。原目录、失败和历史版本均保留。

按[实施合同](./20261006-TRY-02-mnemonic-current-design.md)，实际 Chrome 从创建助记词账户进入密码保护、备份显示隐藏与确认，RAM 内派生地址与后台一致。实际 GraphQL 在 S667441／S667444 读取新地址完整空集合；这是该快照的结果，不是注资后资产追平。最新 RTD HEAD／diff 与八 debug 在运行前逐项核验，同 H0 保持；一次 V2 faucet 从余额0注资1000 RTD，原意图及回包摘要保留。

[内部币页面实际执行](./20261006-TRY-02-current-mnemonic-execution-01.json)通过9检查、4次 checks-enabled 模拟、1签名、1 Execute。发送1原子RTD，批准摘要 **4EgomtC14Ch95Q8sBdGrtyVmpvkLBHzBaPgMUBr5aQgy**，自动进入成功收据，strict confirmed-success／pending0。[独立链上审核](./20261006-TRY-02-current-mnemonic-native-01.json)核对原批准BCS、原完整Execute请求、Ed25519签名、原生effects、checkpoint **985572** 与实际收款增加1原子，审核0签名／模拟／派发。

[锁定重启恢复](./20261006-TRY-02-current-mnemonic-recovery-01.json)重新打开仅本批拥有profile：保留原账户、原摘要和strict终态；错误密码拒绝，正确密码解锁及实际解密密钥地址验证后重新锁定。加密账户／accountSources逻辑摘要在该只读恢复及密码检查前后相同，journal不变，0新签名／模拟／派发。不把这个摘要范围写成关闭前未采集的比较。

原 C21 创建／助记词导入恢复／普通与私钥导入账户 Wallet Standard 两次成功、原RPC-04混合资金与双币页面，以及原真实链失败和失败收据仍明确标历史。本批逐字比较原C21与C24两个实际map中 **78份** 账户、导入、币表单、收据、交易／执行源码，未更改历史日期；QA-A05当前完整双币读取与明确范围验收保持。当前全量181文件2551项及类型已由同源码的原运行绑定，本批新增QA-A08七文件189项另计，不声称重新执行一次全量。

首次综合审核01选错map查找仅background内的execution-reader而失败、未产生通过JSON，保留原脚本和日志；新的双map审核02通过。一次发送工具不得再次运行；后续仅恢复原摘要。原HTTPS、CA、索引追平、全部NFT及其它TX／QA仍独立开放，trial_ready=false；TRY-02完成不代表全钱包可试用。
