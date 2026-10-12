# 赞助矩阵完整实测与 Gas 选择审核字段修正

第十一轮 actual passed：四路各四种有效期，16个唯一发送方正常批准、16同字节赞助签名、160修改字节旧签拒绝、四单签执行拒绝；40 SimulateTransaction、16 VerifySignature、6284完整原HTTP实体、42499中间事件、三实际私有入口16/0/0、零Execute、无capture/cleanup错误，正常关闭且浏览器终态无缺失。

独立01未通过：C114-nft-wire-contract-v3.simulation 在resolution=true时严格检查Gas选择完整请求/响应及选中对象后返回gasSelection=true，并不返回success。v13错误对四路各第一条Gas选择请求断言success，导致undefined被拒绝。这不代表链上模拟失败，也不能填造原结果。

v14仅对此分支改为Gas选择必须gasSelection=true；每路第二条完整交易仍须canonicalFinalBytesAndEffects=true及success=true。其余全部32条赞助最终模拟、双方签名/160反例、原请求响应、终态、私有入口、持久数据和独立字节解析保持。原解析器完全未改，与C163审核同类准备逻辑一致。使用同一actual11原报告和完整响应重新审核，不重新批准或签名。

独立02最终通过：四Gas选择/四内部最终效果、16双签/160反例、40Sim/16Verify、6284完整实体/42499事件，12实体/观察器缺证反例全部拒绝，浏览器重复副本缺失和零发送前取消均为0。全部原输入SHA和36服务actor/116容器/最新debug来源保持。完整收口仍等待C189当前冷恢复独立报告。
