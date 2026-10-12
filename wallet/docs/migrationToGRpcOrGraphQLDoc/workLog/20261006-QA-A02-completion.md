# QA-A02当前真实Chrome身份／SDL／包绑定完整验收

2026-10-06。按[实施前R1–R5](./20261006-QA-A02-loopback-design.md)完成原父合同；[勾选前综合审核](./20261006-QA-A02-completion-audit-01.json)通过，勾选后02重新核对。只有QA-A02新增，70/98（71.4%），余28；NET04／ENV07／QA19及完整业务仍开放，trial_ready=false。

[整轮03](./20261006-QA-A02-browser-capabilities-03.json)在独立revision3候选的真实扩展origin完成五个案例，测试驱动81次实际只读Fetch，0模拟／签名／Execute、无CA例外／响应替换。实际钱包UI三脚本和worker另外逐字匹配；驱动由51个当前生产RPC源码及同生产安装SDK依赖组成，461输入字节全保存，不能称产品UI主动调用了测试驱动。

| 实际案例 | 请求数 | 结论 |
| --- | --- | --- |
| 完整能力＋SDL | 51 | 前后Fullnode／GraphQL／Archive完整H0一致；Account另由四角色Chrome实际H0验证；11项SDL兼容、7配置领域snapshot verified，names unconfigured，native probes verified，账户coverage window verified |
| 独立包正读取 | 14 | 四包匹配原24,451认证检查点独立声明，Move合同兼容；serviceDeployment／execution保持not-verified／not-probed |
| 错H0 | 2 | 真实服务数据与错误期望冲突，NetworkIdentityError chain-mismatch，未接纳结果 |
| 错pin | 14 | 一个故意错误的独立测试pin对应pin-mismatch，另三个匹配，reviewed-deployment-degraded |
| 错revision | 0 | 本地声明binding拒绝，未发网络；不称服务端拒绝 |

聚合期间保留范围前进，部署assessment正确incomplete/partial；单独14次包读取约130ms取得稳定原窗口与真实matched。没有将聚合partial改为matched，最终readiness仍not-assessed、crossDomainSnapshot和serviceDeployment仍not-verified、execution not-probed；七领域各自完整S不宣称跨域单S或全局ready。

独立Node SDL实测与Chrome规范schemaSHA及11合同全部相同，独立Node14次真实包读与Chrome四包匹配结果一致。账户只证明声明窗口、三已发现范围旗标，不证明账户全集／注册完整／非空业务。完整报告及[469份全相对路径输入保存](./20261006-QA-A02-current-inputs/manifest.json)由综合审核逐字核对。

01聚合读已有兼容schema／native／七领域，但脚本要求聚合部署必为observed而失败；02五案完成后总结错误读取partial.value.packages失败。原两个整轮失败、profile、所有逐案结果、原脚本版本保留，03改用实际独立dep结果汇总，整个五案重新执行并通过，不改产品门槛。esbuild依赖不在钱包顶层，实际经tsx已安装依赖解析，没有安装或修改lockfile；两条历史脚本元数据写“十合同”保持历史，实际本次断言11。

产品f867a8d4／1108文件保持，既有179文件2525／类型及QA-A10真实故障证据按原时间仍有效，本次不重复报新全量。源码、候选、profile、registry及归档／服务字节保持；没有原账户或七历史profile操作。原HTTPS系统信任仍独立待验，本项是已明确允许的literal回环HTTP开发端点合同，不能计ENV07／QA19或完整试用通过。
