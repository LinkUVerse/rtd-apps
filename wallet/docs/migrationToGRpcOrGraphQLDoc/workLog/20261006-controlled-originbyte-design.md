# 受控OriginByte真实转移准备

原OriginByte示例两件NFT的cap属于未控制账户，不能据其非空列表冒称钱包可转移。为完成RPC-22／RPC-23／QA-A07，使用既有同链迁移夹具的seed，为受控source和target创建两件NFT及目标Kiosk；不覆盖原夹具，不重发Personal原转移。

- [x] O1 当前8debug／源码／H0／五pin／既有package实际seed ABI核验；同source全部原pending按原摘要终态只读复核。
- [x] O2 构建精确unsigned seed BCS并正式checks-enabled模拟，核验sender／gas／digest／成功effects；此阶段0签名／0Execute。
- [x] O3 持久原pending后只执行一次seed；异常只按原摘要恢复。真实cap、共享Kiosk、两件NFT及目标空Kiosk独立原BCS验收。
- [ ] O4 实际认证GraphQL覆盖后，当前C26 Chrome分别走已有目标Kiosk和创建目标Kiosk两种生产转移分支；最终bytes／签名前检查／单次Execute／原摘要恢复／写后读刷新及0旧RPC独立审核。
- [ ] O5 同原生Kiosk／Personal分支、NFT风险提示、所有支持分支合同汇总通过，才勾对应原父任务。

该夹具只由link-u-smart-contract/all-in-one-deploy/localDeploy源码／工具处理；最新RTD源码debug、原链与数据保持。准备／模拟不代称实际转移或父任务完成。

O1–O3实际范围见[进展及独立恢复](./20261006-controlled-originbyte-progress.md)，O4／O5仍待。
