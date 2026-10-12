# TX-07／11：批准页保持pending并只读恢复

日期2026-10-03。接通上一批后台原签名恢复命令。

redux执行分支收到pending／空恢复结果时返回approved=null，不向dApp发送失败、不改变请求为已批准。执行命令发出后发生通信或其它异常，同样保留请求，因为异常不能证明未执行。只签名和发送命令前明确验证失败仍按原响应处理。recoverOnly模式只调用recoverDappExecution，不使用批准token、不签名、不dispatch。

新DappRecoveryGate在初次journal查询完成前不挂载交易预览子树；无原记录才进入普通预览。有pending时展示原摘要，每3秒只读查询，确认后由“返回原执行结果”再次后台核验并返回。查询失败显示错误，不退回新预览。执行尝试后即使暂时查不到journal记录，也保持恢复态，不能据null重建重发。用户关闭明确提示不会撤销可能已提交的交易；journal保留。

恢复查询key含requestId／account／origin／原绑定／当前profile绑定／readSession／锁状态，gcTime=0且不持久化缓存。调用取消时忽略迟到结果。锁定账户显示已有解锁入口，不查询或准备；解锁后重新查journal。后台原有请求来源、当前权限、有效期及生命周期检查保留。

验证：全量80文件889项通过（20261003-dapp-recovery-ui-full-tests.log）；最终补充当前profile／session缓存键后3文件20项定向通过（20261003-dapp-recovery-ui-tests.log）。完整TypeScript检查通过（20261003-dapp-recovery-ui-typecheck.log）。初次构建发现nullable账户props类型不匹配已修复，最终开发版构建见20261003-dapp-recovery-ui-build-dev.log。

覆盖pending不发送响应、响应中断不关闭、恢复只读返回原签名、查询中不挂载preview、执行后null仍禁止新预览、读错误不放行以及锁定／解锁。单测使用真实React／QueryClient与受控background结果；不是实链dApp或扩展多窗口测试。

当前仍缺实际Chrome dApp、断连／worker重启／端点不可用真实回归及后台自动唤醒；原请求在worker丢失活动连接后不自动复活，journal保留供钱包独立恢复。未将跨重启dApp响应交付宣称为已完成。TX任务不据本批局部UI勾选，继续所有接口／核心链路后再试用。
