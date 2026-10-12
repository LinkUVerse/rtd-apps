# C44 正式发布阶段与完整命名空间 N1–N5

本计划推进既有 TX-08／QA-A20／RPC-22 的前置，98 父项保持。原发布器7463／工作子79715及其through434325属于同H0最新debug正式任务，不能因观察等待超时重启或重跑。所有原namespace／VersionId／native quorum／连续性／SHA／双副本／publisher epoch／控制准入不弱化，不以诊断计数授予覆盖。

- [x] N1：当前同owned命令活性、2秒readonly原生采样及实际当前prefix审计计数留证。样本保存private700／600，仅公开函数／数字；原输出可能含进程参数，不在用户输出展示。
- [x] N2：核对实际子命令源码、既有分区函数与客户端官方源码；执行全部完整前缀与命名空间边界测试。现有`audit_published_namespace`已实现十数字prefix＋lower＜0＋upper＞9，包含9重叠，不忽略隐藏、非数字、标点或Unicode；当前发布器尚未调用该函数。
- [x] N3：用同scope private TLS身份对当前整个published bucket执行真实8-worker分区枚举，记录每分区有序key digest／计数、完整API调用和fresh只读SQL前后状态。全namespace不是旧4096小样本；仍不授权发布。若真实枚举失败，保存失败，不以静态测试冒充成功。
- [x] N4：准备独立publisher候选，只有ROOT明确保留原信任／配置路径、import搜索路径和串行namespace调用改为已有完整分区审核；所有原原生认证、发布/epoch/SQL/replica/blob逻辑原字节保持。独立检查精确反向还原、AST、fullnamespace原始收据／完整运行authority和来源；不覆盖正在用的源文件。
- [ ] N5：只有真实N3／N4证明与后继生命周期／自然no-child、pending=null边界成立后，才实施独立明确publisher authority的真实替换和回滚。正在工作的原批次不终止；未安装不勾。再验证真实publication推进／424677七门槛及完整当前NFT资金回归。

客户端已安装MinIO Python7.2.20；`list_objects`支持prefix／start_after／recursive；include_user_meta当前默认false，不存在“关闭原本默认开启metadata”的收益。对照[官方7.2.20源码](https://github.com/minio/minio-py/blob/7.2.20/minio/api.py)，候选保持这些默认与真实分页协议，不能猜测其行为。官方旧API文档URL重定向后工具无法访问，已改用对应官方tag源码及本机实际签名。

前一批完整读取keepalive仅1.09956倍、未安装，本计划不重复该低收益实验。当前实际diagnostic verified48128／total401215、target434325、326秒是在本批次更新；旧verified376724／target401214仅历史计数。仍需readonly SQL确认正式published边界。


本轮实际记录：[N1／N2与进度工具修复](./20261007-C44-namespace-diagnostics-01.json)。同owned工作子79715的命令SHA继续匹配；2秒原生样本仅公开SHA／大小／线程标签数量，原始报告保留private600。当前校验诊断224256／401215、target434325，不是正式水位。

v2真实扫描已失败：同分区第二个10000进度点以O_EXCL重复创建同名文件，触发FileExistsError；失败记录及不完整分区收据保留在原私有02目录，不能充当完整枚举证据。v3仅将诊断进度文件加入count后缀并使用新的03操作目录，反向还原与v2逐字节相同。4项测试直接提取并运行两个真实驱动的ListingOnlyClient，复现原20000点碰撞，验证25000有序键两次进度／600权限／原枚举故障传播／lower sentinel不计digest；另7个原完整前缀／namespace测试通过。真实整个桶扫描继续，N3／N4全收据部分和N5均未完成。

[环境复核](./20261007-C44-namespace-current-environment-01.json)29钱包容器运行／14health、原进程／八debug／1015私有文件／1120产品保持；实际全局110＝98运行／12退出。累计47已确认退役容器回收，本轮无新容器／信号／额外清理，12未确认退出保留。[正式SQL阶段02](./20261007-G3-C44-namespace-publication-stage-02.json)仍published401214／pending434325，prepared尾部0行。[覆盖04](./20261007-C44-nonempty-kiosk-readiness-04.json)HBase392109、SQL392112、Rocks392114、Display392113、十域392113／account392100；424677七门槛均未齐。观察passed表示读数成立，不能勾父项或启动资金流程。


N3／N4后验已完成：[真实完整枚举03](./20261007-C44-published-namespace-qualification-03.json)、[独立12分区收据03](./20261007-C44-published-namespace-independent-03.json)证明观察时整个0..401214及4 metadata共401219键；含9前缀显式11111重叠、lower sentinel不计，共412330次枚举名称，elapsed974.52秒。两个fresh只读SQL均active／published401214／pending434325／epoch1。原02不完整失败保留，03所有10000进度收据600且不覆盖；全收据不替代blob／VersionId／副本／native／epoch，也不授予434325发布或后来的namespace状态保证。正式publisher安装后仍必须自行重复全部检查。

原namespace-only候选16实际调用审核保留；新的[旧前缀并发C1–C4](./20261007-C44-prefix-audit-capacity-design.md)在1024真实native quorum输入／四轮20480原调用收据中得到1.3823倍，独立审核通过。准备[组合loop／publisher候选](./20261007-C44-combined-publisher-prepared-01.json)、[30实际语句／CLI／pool／import核验03](./20261007-C44-combined-publisher-independent-03.json)：namespace仍max8，只提高旧前缀max16／source连接池16；两文件替换可逐字节反向还原，所有copy／native／SQL／epoch／replica／marker逻辑保留。两个CLI测试工具遗漏env-file／REPLICA_READER默认项的失败原样保存，实际候选源码未因此改变。N5仍未安装，后继身份和真实自然边界／切换回滚未完成。


后继生命周期仅完成[配方02](./20261007-C44-publisher-successor-plan-02.json)及[真实窗口02](./20261007-C44-publisher-successor-window-02.json)检查；v1解释器配方复核不合格并保留，02原虚拟环境已实测。原working／pending434325／新尾3316行，不发信号、不切换；新的运行authority和实际激活／回滚还未实施。N5保持开放。
