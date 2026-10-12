# F1d后台固定交易依赖门槛：本轮有限编码与验证

按[原六阶段设计](./20261005-background-move-admission-design.md)、[本轮编码细化](./20261005-background-move-admission-coding-design.md)与[原生先存设计](./20261005-background-move-admission-native-design.md)实施。依赖从approvedTransaction固定BCS／sender重解码，作者目录精确package／module／function及依赖闭包；五个动作模块有单独来源，复制Kiosk descriptor的辅助阅读族不会扩大take目标。builtin不伪Move ABI，Publish／Upgrade／未审核用户函数与类型仍opaque，有限结果不包含账户／payload／授权布尔。

后台默认native准入库，与UI用相同compile-captured发布selector；不会读取UI报告作为授权。已审核Move目标先提交Fullnode身份＋12实际探测族原ticket再SDK，完整body／cleanup才正常complete。缺声明保留unreviewed，不升级service deployment或execution；rejected registry拒绝相应Move审核操作，目标package pin与ABI缺正例失败。已知ABI按目标依赖拒绝且无关Display不伤staking或builtin；typed H0负面先关闭session并保存，写失败不第二次空决定，取消迟到保留pending。普通builtin／opaque无审核Move根只有native负面前后重检，未伪造包事实。

内部与dApp execute在coordinator无原record／pending后的simulate回调激活；后续模拟、签名、验签、commitPending及dispatch前各authorize重核。dApp sign-only排除原pending后激活，签名产生和验签后仍核验；owner／profile／permission在probe前后独立核验，最后再native目标重读。旧record／scope pending只读返回、recover signing=false／readOnly和personal-message不激活新Move门槛。最终native读取后的原子窗口仍开放；重复assertClear不能作为原子竞争完成证明。

[最终检查](./20261005-background-move-admission-checks-final-01.json)记录167文件2358全量／41新增、9文件164定向，最终钱包和native类型、10来源＋2native来源格式及Node语法实际0。[原生浏览器14项](./20261005-background-move-admission-native-01.log)通过，58合成协议请求，默认库H0错链、target coins ABI／Display隔离、跨context pending、取消迟到、put成功后abort的normal／ABI／H0三类完成及6种状态正常整浏览器重启；0页面错误／外部请求／实链／模拟／签名／Execute。原生依赖accessor仅负面读取，不能冒为授权回调；Fullnode-only夹具不冒四入口，正常重启不冒物理掉电。

首轮guard夹具旧Display类型名导致1失败／29通过；初次接入旧dApp伪session与缺Move协议OriginByte夹具导致12失败／145通过，原日志与7份诊断源码保持。修正DisplayKey、sign-only使用真实session／控制memory store并扩大9次owner撤权反例；execute单元仅mock新gate factory做固定输入／激活前后回调检查，内部OriginByte用实际SDK的GetObject／GetPackage合成响应。完整真实dApp入口／扩展仍需后续，不能由callback mock代称。

[6份改动前原字节](../evidence/20261005-background-move-admission-before/manifest.json)、[7份失败源码](../evidence/20261005-background-move-admission-diagnostics/manifest.json)、[133项当前映射](./20261005-background-move-admission-source-inventory-01.json)和[整产品精确重建](./20261005-background-move-admission-unchanged-product-reconstruction-01.json)保留。12本批来源，1076产品SHA907993532b089b4caf1f6b7080bacd4ca0973e26517e00518091ae9119acc344；在内存用6原SHA并去除4新增产品来源，精确恢复原1072项26d5c20f状态，证明其它钱包／core／配置／SDK／lock字节不变。

F1d.1–5完成上述有限编码；F1d.6已补定向／全量／native，真实发布pin／服务部署签认、最终原子授权競争、完整批准和原journal恢复反例、四入口normal CA／当前扩展核心Chrome仍待。尚无新bundle、dev／journal／回放操作，PID66145保护保持；父49/98、trial_ready=false，见[更新前状态](./20261005-current-state-before-background-move-admission-coding.md)。
