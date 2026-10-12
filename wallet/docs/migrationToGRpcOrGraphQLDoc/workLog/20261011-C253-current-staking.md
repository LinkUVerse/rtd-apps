# C253：当前普通 Chrome 实际质押

当前C250、指定dev账户0xd50b…077c在本地链质押1 RTD给validator-0。最终预览BCS、发送者、系统共享对象、`request_add_stake`、金额、验证者、Gas预算3419224和Validity epoch5..6全部审核通过后只点击一次提交。

原摘要`CQjbs6dkkBJaTKuecr4yh7qnRPPbb6iHnKdSM26k8DqS`执行成功，原生GetTransaction确认checkpoint1988842。实际Gas2429104，账户扣减1002429104；当前ListBalances为998867535440，Chrome首页正确显示998.86。收据从事件显示奖励开始第6轮、可领取第7轮，明确“交易已确认，资产数据仍在同步”。

完整HAR452请求，含唯一ExecuteTransaction；所有请求均为配置的本地新接口，无旧JSON-RPC或Sui公网。60项例外独立保留：58项取消和2项HTTP200/原生NOT_FOUND交易读取，不算成功；GraphQL仅在本审计中结构检查，不冒充全部生产reader重放。原digest最终确认请求在执行请求后8.486秒出现。较早UI停留“检查当前账户的待确认交易”已封存，未重复提交。

首次独立审核因原生ListBalances数值为BigInt而使用字符串预期失败；保留01原脚本/日志，02按实际protobuf类型核对通过，金额不变。

**剩余：** 索引S1006768低于交易1988842，质押列表仍为空，因此不能验收新仓位展示及赎回。金额表单曾据旧epoch2显示第3/4轮，与最终新鲜预览epoch5及收据第6/7轮不同；C254修复过期估算展示，不修改已正确的交易有效期校验。P253-1/2完成，P253-3与REL父保持开放。

证据：[预览审核](./20261011-C253-staking-preview-audit-01.json)、[执行独立审核02](./20261011-C253-staking-execution-audit-02.json)、[当前UI与历史等待](./20261011-C253-native-ui-03.json)。NFT另一个夹具账户的新增权限仍等待主人回复，当前无读取该私钥。
