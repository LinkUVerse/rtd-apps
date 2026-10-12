# C54：正式发布恢复后的有限 transport 对照

本清单先于编码和临时容器操作。正式边界已推进至486334，C53实际38秒样本三cohort均有成功摄取、零NOT_FOUND，但writer约2.23、consistent约2.13cp/s低于native约4.31。八次当前原算法只读计时及真实733个handler事件表明隔离读取与实际负载不同，不能由单一catalog耗时推定唯一瓶颈。

本轮只复用原C44 HTTP11／有界TLS worker候选的全部字节与业务继承。新增独立脚本仅更新当前运行权威读取和自己的私有操作目录、project、41997／41998端口；原C44脚本、五个交接实现、PLAN、原29配置／StartedAt及C52唯一观察器均不改。两个只读预览继承实际guard同一个immutable image、用户、环境、网络、全部原只读挂载；候选仅额外挂载原transport配方。固定205／383000两份已认证内容，八并发四轮baseline／candidate／candidate／baseline，每轮32个，共128实际完整GET，不补播历史负载。

保持原七拒绝检查：格式错误、未知路径、未来检查点、GET body、无client certificate、系统CA不信任、wrong SAN；前三拒绝后同socket作完整fresh恢复。每次业务GET仍调用原Handler及完整SQL／marker／source／replica校验；不复用准入事实，不改pool或业务并发。实际socket、HTTP10／11版本、完整body与摘要逐帧保存。

对照后，无论测量通过与否，都只对两个精确自有preview发送正常SIGINT并等待实际退出，保留退出码与日志，非force删除且不删卷／镜像／数据。未退出实例保留并报告，不升级为强杀。独立核验当前原29／14、两个ID实际不存在及端口空闲后才计清理；历史52累计只按实际增加。

保持1.20的准备阈值。即使本轮超过该值，也只允许后续完整生命周期和运行权威设计，不能直接重启guard／consumer或使C52旧PLAN失效。低于门则保留候选未安装，继续定位其它成本。有限样本不等同持续追平、524022覆盖、普通Chrome或98父合同验收。
