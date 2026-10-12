# 新仓位的当前生产赎回构造与重新模拟

属于TX-01／TX-04的核心链路补证。使用当前C42生产源码、新仓位原332734成功摘要和真实G3 Fullnode；不打开任何原Chrome profile，不读取私钥，不签名／发送，不将Node readers组合当作当前UI的完整Provider、执行锁或indexed准入。

- [x] W1：当前完整product source、最新RTD debug guard／H0、新仓位canonical BCS／owner／principal／version／digest以及系统V2 wrapper和余额核验；固定原回执与原stake，无新交易。
- [x] W2：真实WalletFullnodeReader／WalletTransactionReader和prepareStaking产生withdraw final bytes，正式kind gas选择与最终ENABLED模拟成功；同sender／gas／链绑定Validity和精确原仓位引用，随后revalidateStaking只模拟原最终字节。
- [x] W3：真实改动最终Gas预算后重新正式模拟，新的canonical摘要必须改变；保留原审核摘要必须由revalidateStaking关闭式拒绝。真实错误owner／错误类型对象和跨binding重校验拒绝；逐阶段计数区分正式模拟和原生读取，不声称UI实际Gas修改或重新批准。
- [x] W4：独立审核原完整gRPC-Web帧／grpc-status=0、原生effects、三次原最终字节／新Gas字节、canonical Move调用／当前owned和shared引用／Validity；初末原stake与余额不变。Node范围通过后仍等待C42实际表单、同scope锁、Back／重锁、完整journal、S>=332734与全部父合同。

出现失败就保留原响应，不将模拟成功当作实际赎回／奖励发放，不以mutation／cache／watermark注入补齐indexed业务。

[生产实测01](./20261007-G3-current-withdraw-core-01.json)及[独立01](./20261007-G3-current-withdraw-core-independent-01.json)实际通过：43完整帧／四ENABLED模拟／canonical object和effects，原principal1e9、当前V2 shared系统和exact stake version2／digest引用；原withdraw preview摘要CsAif3BVHTJpCA9srpXffmiTuXxuCH5KVzEbfpnqGqcy。真实gasBudget2000000→2001000，摘要改为9VaGrgDjWq59UYbxfzsm6A9VcfAnjLSpg8y2W6wPkCCe，保留原摘要在正式新字节模拟后明确拒绝；三个其他负例0模拟。初末canonical stake和余额全相同。没有读取私钥／签名／Execute／浏览器／indexed仓位接受，Node reader组合不含UI Provider的preparation guard／journal／Web Lock。W1–W4仅此核心子范围完成，98父项仍开放。
