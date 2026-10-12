# C17 真实签名和 Display 查询配置

本次产品仍为 1103 份源码、SHA 73c0e8ca11bb4886a2264e87f6ed31fc622779bad56cb83e2941d578f96dd0e6；实际 UI／worker 字节证明和生产闭包见此前 C17 日志。

[实签 01](./20261006-c17-real-sign-only-01.json)通过真实 Wallet Standard 连接、账户导入／锁定／重启／解锁、PersonalMessage 和只签名 Intent 密码学核验，3 次模拟、0 Execute。[有限生命周期 04](./20261006-c17-real-lifecycle-matrix-04.json)通过来源／tab、锁定批准、账户切换／取消，以及 sign／execute 两类真实 account.signData 返回被持有时的 lock／account／cancel 六个事件；拒绝旧结果和广播，恢复真实方法，21 次模拟、0 Execute。公开 seed 7 的隔离测试账户，无原用户私钥、无 SPKI 或证书信任修改。网络切换不在 04 的通过范围内。

01–03 生命周期失败保留。02 在切回 Local 后拒绝后续签名，03 等待 canonical pending 120 秒仍未恢复；这是真实待修问题，不清除 pending、不以延时重试掩盖，也不据 04 完成 TX-10／QA-A18／E7。

[原七 journal 07](./20261006-egress-producer-c17-original-journals-07.json)逐字 worker 证明及七条回执／effects／逻辑内容保持，0 模拟／执行。03／04／06 inspector 超时失败和旧 launcher 保留；getScriptSource 的独立超时改为 30 秒，其他命令保持 10 秒。普通 CA 的 inert manifest+HTTP 范围不代表 HTTPS 接受。

[Display 修复设计](./20261006-display-query-watermark-design.md)及 link-u-smart-contract/localDeploy 中受控 helper 完成只重启拥有的 GraphQL。原 SQL indexer 的 22 管线配置保持；查询配置派生第 23 项 hist_displays，使 availableRange 能包含已严格覆盖 0..586007 的独立 Display 回放。9 项部署门槛测试通过，旧配置和首次 apply 停止检查失败保留；明确 continue-stopped 仅在旧 PID 已不存在、所有输入仍匹配时继续，未重复信号。

[当前 11 伴随进程](./20261006-display-query-owners-after-01.json)拥有身份和最新 debug 保持，SQL 4／consistent 1／writer 1 分配未变。[正式资产共同快照](./20261006-c17-common-snapshot-reader-02.json)固定 S=586007，读取系统对象、余额和 3 个 owned objects。[七个已配置域](./20261006-display-query-domains-after-01.json)均 snapshot-verified；names 未配置，账户完整 activity 和独立发布声明仍未通过。Node 公开 CA 验证不替代普通 Chrome HTTPS，不能把七域成功称为全部网络准入。

父项仅 QA-A11 新增完成；其他父合同继续按完整范围验收。
