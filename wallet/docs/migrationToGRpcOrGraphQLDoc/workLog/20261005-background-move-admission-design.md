# F1d后台交易依赖门槛：实施前细粒度设计

本设计接续[只读实际审计](./20261005-background-move-admission-pre-audit.md)，F1d.0审计完成；F1d.1–6仍待编码与证据，不预勾父任务。UI报告不作为后台授权；共同编译registry只提供被单独审核的输入，不自动证明服务部署或执行语义。

| 顺序 | 子任务 | 验证要求 |
| --- | --- | --- |
| F1d.1 | 从固定批准BCS生成纯依赖合同 | exact sender／digest及canonical bytes已有校验；精确package＋module＋function匹配作者审核目录，以目录dependencies做闭包；相同package不同函数／同名不同package不能互换。builtin单独分类，Publish／Upgrade和任意未审核用户函数／类型只记录opaque，不冒称审核闭包。冻结结果，不持久化payload／地址。 |
| F1d.2 | 后台独立Move／release观察原ticket | 默认native store，先精确native capture与本次目标负面重检；受控registry与UI使用同selector。观察所有实际读取区域必须列入原ticket并先提交；有界read-only transport＋实际SDK，完整／物理settle才complete同原对象。HTTP503／取消／cleanup在途留pending，不第二次空complete；typed identity负面和明确ABI负面先保存。 |
| F1d.3 | 依赖范围政策与末检 | 全binding identity／目标pending阻止；local ABI只阻相应固定交易依赖，Display等无关阅读合同不伤builtin转账。缺pin保持unreviewed，不能成为发布授权；rejected registry／已配置相应package pin不同／目标unsupported或incomplete不能发布审核正面，按有限政策拒绝相应新操作，不伪造identity Fault。当前事实末检、account／permission末检各保留，最终原子窗口独立待。 |
| F1d.4 | 内部固定bytes模拟／签名／dispatch边界 | 在coordinator确认无原record／无待决scope之后，新交易首次模拟之前激活固定交易门槛；之后每次authorize与签名／commitPending后的dispatch前都重检，不重建批准字节。不在原record／旧pending只读返回前强加新ABI要求。必要扩展回调模式须显式证明恢复无模拟／签名／dispatch。 |
| F1d.5 | dApp只签名／执行实际接入 | approvalToken消费与固定bytes校验后使用同合同；后台request／sourceHash／origin／mode／permissions独立重核。sign-only模拟前、signData前后、签名校验后；execute复用coordinator同新操作边界。readOnly恢复和personal-message明确不进入Move门槛；签名产生后仍不得迟到发布。 |
| F1d.6 | 定向／全量与原生／真实扩展收口 | 单测必须包含精确匹配与opaque、builtin无伪ABI、非相关Fault、typed负面写失败、postcapture竞争、begin失败0SDK、取消迟到／lease不空complete、三类实际后台入口及readonly原record例外；原生默认库／独立context／正常重启补storage证据。全量／类型后再构建当前扩展与指定最新debug dev核心Chrome，不提升物理故障／最终原子竞争／独立真实发布签认。 |

必须先保存所有改动来源原字节、当前产品／完整源码映射和既有失败。每项实施日志仅记实际执行范围，最终授权竞态不能因多次assertClear就说关闭。普通builtin依赖不凭概念Move签名、gas使用或Pure bytes猜测对象类型；如需要关联对象类型，另取当前独立Fullnode事实且绑定固定ObjectArg／version，直到该证据存在仍保持opaque。声明与目录不能将未审核自定义Move库静默称ready。没有新的可信发布pin时继续准确暴露未审核状态，不能从当前服务数据生成自签声明替代它。

本设计不改变RTD启动约束：需要dev时必须重新确认最新源码编译debug产物，部署只用link-u-smart-contract相应脚本；不重启／resume受保护PID66145，不操作原journal／watermark／genesis。父49/98、trial_ready=false保持。
