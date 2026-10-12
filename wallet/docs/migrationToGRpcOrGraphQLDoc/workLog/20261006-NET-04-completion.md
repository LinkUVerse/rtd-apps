# NET-04 查询能力、降级／错链／重建状态合同完成

按[本批N1–N6](./20261006-NET-04-current-design.md)核对原NET-04编码合同，勾选前[独立审核01](./20261006-NET-04-audit-01.json)通过，勾选后再审核。当前C23源码7aa23d11／1110文件；没有为本项改业务源码或重启开发链。本项完成状态编码与查询合同，全部QA／交易／普通HTTPS及全局ready仍按原独立任务，不减少98项范围。

| 本项合同 | 当前编码及验证 |
| --- | --- |
| 身份、SDL及领域覆盖 | identity／graphql-schema-capabilities／graphql-domain-capabilities／native-service-capabilities／account-history-capabilities，四角色身份独立，八领域及原生方法按配置探测，无客户端或签名授权发布 |
| package及部署权威 | move-package-capabilities／deployment-capabilities／reviewed-deployment-registry，五pin独立连续证书，原运行匹配不代替证书；十二Move组按配置支持或明确不可用 |
| 正面与降级 | network-capabilities／read-capability-view／read-capability-observation，有限snapshot/schema/native/package状态分层；每域独立S，未配置names与有限账户历史不冒充全局ready |
| 错链、reset及会话 | profile／session／network-observation-state／read-admission／WalletRpcProvider，错H0和退高隔离，显式generation独立，旧scope及journal保留；迟到响应与旧正面不回写 |
| 页面及请求准入 | Provider受控RPC与各领域错误状态，短暂popup不制造悬挂观察；持续页才做完整被动观察，撤旧报告保留独立可证明的域，交易另做最新身份／输入／批准 |

[C23普通Chrome五案例](./20261006-NET-04-browser-01.json)由[461实际生产输入测试驱动](./20261006-NET-04-browser-bundle-01.json)执行，产品UI／worker另逐字节审核。测试驱动只读Fetch不是产品UI主动发起全部探针；0模拟／签名／Execute，原账户和七原profile未打开，未替换响应或修改CA。

| 实际案例 | 请求数 | 结论 |
| --- | --- | --- |
| 综合能力／SDL | 54 | 11合同compatible，七配置域独立snapshot-verified／names unconfigured，账户有限窗口586007–655254；archive前不可用后恢复，Fullnode原生changed降级，部署partial，全部按实记录 |
| 五包正面及ABI | 17 | 五个独立pin逐一matched，selected-contracts-compatible；运行结果不是执行授权 |
| 错H0 | 3 | NetworkIdentityError chain-mismatch，未接纳期望外链 |
| 错pin | 17 | pin-mismatch及reviewed-deployment-degraded，不忽略错误包 |
| 错revision | 0 | 本地declaration-rejected，不称服务端拒绝 |

不同域S655320／655326／655329／655331原样保留，不能拼接成跨域S。综合部署partial未被单独matched结果覆盖；readiness保持not-assessed，crossDomainSnapshot／serviceDeployment保持not-verified，execution保持not-probed。完整schema与能力仍不保证交易ready或当前NFT已索引。

[当前完整181份2545项及prod类型](./20261006-personal-handoff-verification-01.json)已经通过，避免无改动重复执行。从同一全量日志逐项核对26份有关测试：包括profile／session／H0／native／SDL／Move／账户窗口／network-capabilities／reset持久状态、真实Provider12切换案及旧观察撤回；详细数量、全部源哈希和完整相对路径输入保存在独立审核及[输入清单](./20261006-NET-04-current-inputs/manifest.json)。这些是组件／模型故障验证，QA-A17真实服务器dev归零仍未完成。

完整C23闭包5277模块／2033源码／7JS及实际Chrome四角色源、两侧相同SDK状态合同和原14章节留存另已核对。本项不标ENV-07、TRY或其它QA完成；原NFT自动跳转失败和C23只读成功收据保持分层。Task和totalProgress按实际本项完整验收增加一项，其余未验收继续推进。
