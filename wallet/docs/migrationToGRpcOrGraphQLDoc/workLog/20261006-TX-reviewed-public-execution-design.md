# C20普通／导入账户实际执行合同

编码前依据：C20签名04实际81项、4消息签名／2交易签名、6次checks-enabled模拟及0Execute通过；生产／dev构建同源码7aa9ed8d，旧C19及所有失败profile保留。父65/98不变，trial_ready=false。

1. 使用全新随机12词及独立私钥，各在空余额、H0与归档genesis0核验、所属观察结束且零Fault后经已有V2 Faucet注资一次。原失败03与签名成功04不重新打开或注资。
2. 先各完成消息与只签名，再各批准一个demo现有的拆币／转出交易。批准前写独占attempt，Execute报文必须与该批准摘要匹配；每个摘要只准一次，总共最多2次，其他业务写接口阻止。模拟、请求与实际worker/UI字节记录。任何未知结果只能按原digest恢复。
3. 核验返回bytes／SDK签名／批准digest、effects原生BCS的成功终态，以及各原requestId的confirmed-success journal。第二账户保留第一账户已确认记录；不得删journal来满足条数。
4. 正常关闭前所属观察收尾，重启同profile实际锁定、密码保护与加密source保持；只读再次核对两条原journal，不重签或再发。恢复12词在另一个新profile中验证，不声称导入私钥属于助记词恢复范围。
5. 本批只完成当前候选的普通成功执行；链失败、资金表单、完整赞助／有效期授权、断电竞争、普通Chrome HTTPS仍独立验收。父任务按全部合同收口，不以两笔成功替代剩余范围。
