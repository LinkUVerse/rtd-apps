# RPC-11 当前非空质押预检

QA-A12完成后父计数61/98，当前C19源码／产物与原七journal已核验。先用正式WalletStakingSnapshotReader通过公开HTTPS39600、公开dev CA读取原测试owner 0xa0ccc8…2233da，不改profile，不使用native旁路，零模拟／签名／提交。依赖六项独立BCS域，全部汇率与仓位同S，保持20秒总预算及最终revalidate。原stake cp300333之前的空仓位历史证据不能代表当前；本次结果分别记录仓位Pending／Active及reward estimated／unknown，不以空结果勾任务。

若当前非空且Active，继续独立核对仓位原始对象BCS／ID／owner／principal／pool／epoch、完整表大小与汇率，用独立整数公式核对奖励。大规模读取与10000预算必须显式有限fixture及实际分页，不能称开发链拥有10000实际epoch。RPC-13 Chrome页面与QA-A16真实业务另验；普通Chrome HTTPS仍失败，不导入或绕过待确认信任。
