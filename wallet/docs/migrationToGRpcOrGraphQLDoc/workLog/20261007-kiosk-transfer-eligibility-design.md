# 当前Kiosk转移入口准入修复 E1–E5

服务 RPC-22／23、QA-A07、TX-04／08，不另计98父项。实际普通／普通挂牌／锁定／独占挂牌原生夹具及四ENABLED模拟已通过；所有原成功交易、pending profile及其三store均保留，创建器不重跑。

- [x] E1：保留当前C43原源码／构建，新增两个真实React页面回归：独占挂牌／OriginByte未登记或独占不能显示发送权限；普通挂牌仍可见／可进表单。先运行原实现并记录确实失败，不能用helper镜像测试代替页面行为。
- [x] E2：共用 snapshot-only eligibility 判断，详情按钮与转移页相同边界；正常直接／普通／Personal／普通挂牌放行，locked／独占／OB未登记或独占拒绝。准备器Fullnode当前输入／cap及正式模拟保持；已dispatch的表单只保留原结果，临时loading与draft生命周期不放宽。
- [x] E3：相关NFT页面／构造器／能力／生命周期测试和生产类型检查通过，修复前失败原样保留。
- [x] E4：独立新production构建／完整source map与产物闭包、精确before/source delta核验，旧C43产物不覆盖。实际新origin安装另有明确受控后继流程，不能把构建当Chrome验收。
- [ ] E5：在原424677被正式publication／41管线／Display／十域与账户真正覆盖后，以新production和新专用profile验证八件NFT、两页一致的锁定／独占拒绝及普通挂牌/Personal/OB转移链路；没有完成前不勾RPC/TX/QA父项。

权威依据：[Sui官方Kiosk源码](https://github.com/MystenLabs/sui/blob/main/crates/sui-framework/packages/sui-framework/sources/kiosk/kiosk.move)的take拒绝Lock／exclusive Listing，并删除普通Listing；[官方Kiosk文档](https://docs.sui.io/onchain-finance/kiosk/kiosk-example)。当前RTD kiosk.move 317–324同义，原四模拟的MoveAbort8／4与普通成功作本地独立实证。OriginByte额外登记／独占规则采用当前已审定包与生产appendOriginByteTransfer；不冒充Sui框架规则。

实际证据：修复前[转移页01](./20261007-kiosk-transfer-eligibility-tests-before-01.json)5个真实断言失败，[旧详情页05](./20261007-kiosk-details-eligibility-tests-before-05.json)3失败／5通过。原详情页source按before备份原字节执行，临时脚本／component／显式alias配置已原字节归档至私有repair目录；不会混入完整测试集。01/02/03/04的Info16／alias／runtime mock收集失败均保留、不计业务复现。首个production candidate01因临时旧source仍在树中主动终止130，未接受／未覆盖旧产物；[独立02构建](./20261007-default-generation-positive-C44-build-02.json)0错误／2既有warning。

修复后六NFT相关文件[100项实际测试02](./20261007-kiosk-transfer-eligibility-tests-after-02.json)全通过，[生产类型01](./20261007-kiosk-transfer-eligibility-typecheck-01.json)零诊断。已dispatch仅保留原结果；独占读改变撤销未批准表单／草稿，恢复null后仍移除。未修改最终bytes／gas／签名／执行／fresh cap准入。

[全部产物闭包02](./20261007-default-generation-positive-C44-audit-02.json)5285模块／2036源码／7chunks，[独立精确差异01](./20261007-C44-kiosk-eligibility-delta-audit-01.json)还原1119文件C43并验证当前1120文件C44；仅shared/nft-assets、详情和转移页三个运行叶变化。新增详情测试和扩展转移测试不进入生产闭包；其余运行源／旧C43所有产物／开发dist保持。

[专用空Chrome来源01](./20261007-positive-C44-origin-probe-01.json)实际renderer／worker匹配C44产物，来源nbmpcfknfgjmecallhngcincnhklllpj，五manifest origins包含、未知端口不包含；现有C43严格入口明确403。当前安装仍是C43，C44来源注册／完整Chrome资金业务未执行。不得用旧C43执行证据声称1120文件C44产品验收。E5及相关父项继续开放。


当前后继准备：[C44 HTTP1.1严格edge准备01](./20261007-positive-C44-http11-edge-prepared-01.json)只加第13个已实测来源，并改候选project／config挂载路径；三target、CA、mTLS、methods、Header和12既有来源原样保留。实际Docker临时nginx -t成功且--rm删除，未切换41954/55/56。独立[03](./20261007-positive-C44-http11-edge-prepared-independent-03.json)核实110个非Testcontainers完整配置／启动身份、29钱包／14health和原guard均保持；原01误用110固定总数、02因外部Java Testcontainers自然更换会话失败保留，03明确不声称全局全部容器未变。本次准备时全局112（两外部测试容器），独立时113（另会话三测试容器）；它们不属于本操作，不清理／发信号。原准备scope文字All110是固定描述错误，完整实际数量以allGlobalContainersExactAfterTransient=112及原global-before为准；后续独立证据只接受明确范围，不改原记录。

新[C44库存工具类型01](./20261007-C44-nonempty-kiosk-indexed-tool-typecheck-01.json)零诊断；绑定新C44 build02和原不重跑夹具，原v1/v2保留。当前[实际生产拒绝01](./20261007-C44-nonempty-kiosk-production-readiness-01.json)及[独立原响应01](./20261007-C44-nonempty-kiosk-production-readiness-independent-01.json)验证十域共同333000–377510与Display；minimum424677明确coverage拒绝，0profile／模拟／签名／执行。正向分支仍未执行。

下一阶段：受控切换／真实旧edge回滚／最终C44后继与三入口规则及TLS验证，显式新authority保留旧C43全部证据，再独立清理确认退役edge。必须先完整执行验证，不能仅凭候选config注册C44通过；当前newOriginInstalled=false保持。E5依赖正式publication和完整管线实际覆盖424677。
