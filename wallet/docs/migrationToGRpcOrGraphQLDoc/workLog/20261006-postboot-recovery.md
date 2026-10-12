# 系统重启后的dev恢复

2026-10-07续核优先于下方历史观测：[当前C39 Docker](./20261007-postboot-current-docker-C39-01.json)实际28相关容器运行、14明确healthy，原C38边缘停止保留、镜像精确保持；[严格入口](./20261007-positive-C39-edge-audit-01.json)54门禁／八H0／三私有CA TLS握手通过。[原链](./20261007-postboot-original-native-read-01.json)PID12944／原H0与实际推进、[G3](./20261007-postboot-g3-native-read-01.json)PID15618／原H0、两保留对象与实际推进均通过；没有重建genesis或删除数据。[在线审核](./20261007-postboot-online-independent-audit-01.json)14 HBase最低94419、23 SQL最低95469、4 Rocks最低94412，原在线命令／Display谱系／fresh正式发布和source+replica权限保持。C39 new-target与PersonalKiosk两个实际NFT单次转移及独立原签名／BCS／effects／最终owner审核通过，均仍明确显示索引同步；完整Docker冷启动、正常Chrome HTTPS与98父合同继续分开验收。

本次保留原数据、配置和genesis，使用指定localDeploy脚本恢复两套当前源码debug链。RTD HEAD、diff与八个debug二进制实际核验保持原构建绑定。

- Docker两套基础服务均启动；各23条SQL流水线实际TLS只读查询、发布授权和各14项HBase持久水位实际读取通过。
- 新链原H0、两保留对象及实际检查点推进通过；原链三笔原交易回执、当前余额及检查点推进通过。初次原链启动仍在追平，没有推进的read01保留为失败；旧余额基线已有后续交易，不能用于当前余额不变结论。
- 原11个、新12个宿主机伴随服务按原命令恢复，两publisher实际status运行/healthy。没有重置数据或人工改变epoch/pending。
- 新链旧SQL有限消费者在重启前有内核自然exit0记录；旧HBase消费者缺少终态证明，不补写旧回放成功。新独立`certified-postboot-catchup-20261006-01`使用实时发布/namespace授权，两个有限消费者均自然exit0，14 HBase/23 SQL/4 Rocks达到75097，B3按新证明完成。随后按原命令恢复三个在线消费者，真实冷恢复窗口75097–75116；见有限回放及online-resume01。
- PNG41718原字节与四拒绝路由通过。首轮macOS解释器exec造成身份未稳定失败保留；独立终验没有重新启动进程。

中间件真实访问通过与查询共同窗口可用分开记录。HBase重启后位图批次需重放，当前GraphQL Ledger水位尚未进入一致性窗口，不能以进程Up表示NFT业务通过或trial_ready。

上述空窗为较早观测。G3有限回放后已实际进入共同窗口，正在重新验证三种NFT预览；账户独立两个根仍67667，低于75097冷恢复下界，按独立桥接设计连续认证增量，不能假称账户正常。原链三回执/两余额另与重启前最新实际读取数据精确对比通过，见`20261006-postboot-native-preservation-audit-01.json`；被引用历史整份失败仍保持失败，仅使用其中真实read-data作数据基线。

后验：原链window01 consistent779319–786682/GraphQL783022，新链window02 consistent75097–75882/GraphQL75764，两者已有共同覆盖。C33三种内部NFT预览03实际15检查/6模拟/原journal保持通过。账户桥接prepare02/import01连续7430份各完整原生quorum通过、正式SQL/latest HEAD与实际75097核验后分别导入，原roots67667不变。新two loops PID62532/62542已自然提交，独立SQL audit02 token76966/cap76988；API原reloader父子均严格归属，没有更改原命令或重启。实际四角色/完整非空Personal历史继续独立验证，不以worker Up或导入成功替代。

恢复证据：`20261006-postboot-middleware-read-01.json`、`20261006-postboot-hbase-read-01.json`、两链native-read、`20261006-postboot-g3-query-window-01.json`与`20261006-postboot-display-media-recovery-01.json`。原失败和保留profile/journal不删除。98父任务仍80完成/18开放。

## 当前后验：C36/C37恢复与业务读取

上方PID、低水位和待桥接描述是历史观察。当前Docker只读审核 `20261006-postboot-current-docker-C37-01.json`实际28个钱包相关容器运行/14个healthy，旧edge与初始化容器保持已停止状态，其他项目不变。B4在线独立审核通过14 HBase/23 SQL/4 Rocks真实持久覆盖、三个原命令和fresh正式授权；桥接E3完成原谱系连续增量及实链历史验证。

C36受控恢复三个API和六个账户worker，九个owned parent按原命令优雅停止/恢复，链、查询、发布进程零信号。`20261006-C36-rollout-independent-audit-02.json`核验三个API与所有六个自然提交loop，逐个最新sealed SQL payload SHA/through一致；原根payload字节仍不变。旧loop的暂时拒绝不能被描述为整个loop阻塞。实际API为gunicorn parent/直接worker监听，之前“reloader”描述不准确。

C37真实最新扩展12项历史检查/16条活动及独立16条原生事实审核通过；三种NFT预览15检查/6正式模拟/完整journal与relock通过，0签名/Execute。单次真实转移按独立X1–X5清单验收。恢复脚本已加入已存在的正面两个worker，并在启动之前核验六个producer以及三个API的reader/schema/63源码SHA；这次只修改未来恢复入口，没有因此重启已恢复服务。完整试用仍false、父任务80/98。

再次只读后验：当前C38 Docker审核01仍28运行/14 healthy，镜像ID保持，旧C37 edge停止保留；在线恢复独立审核02真实HBase最小91617、SQL最小92737、Rocks最小91608，持续使用三个原owned在线命令和fresh授权。C37两个受控NFT各单次链成功，原生checkpoint168886/170787、原签名/effects/最终目标所有权及原journal确认；初次自动导航失败保留，恢复0签名/广播。Display/隐藏实际PNG/缺图、偏好reload/完整restart/show/relock及独立原生/模板/媒体字节已通过有限子项。当前C39修复准备/派发界面生命周期并另行验收，不凭容器运行或编码通过关闭18个开放父项。
