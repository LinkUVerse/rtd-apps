# PersonalKiosk真实UI发现的Guardian策略遗漏及C22修复合同

当前原父71/98，原C21源码与revision3、revision4候选保持历史；20261006-personal-current-ui-01完整失败保持。12条UI检查／两次checks-enabled模拟均已实际通过，最终whole失败是NftsPage两次调用默认公网guardian/object-list，测试拦截，0签名／0Execute。不能把这次whole失败改写通过。

- [x] G1：保存原C21五产品文件；Guardian query自动与手动refetch都遵守build-owned external-services，关闭时不取默认外部URL，不复用旧缓存充当风险通过。
- [x] G2：显式disabled／loading／error／ready；非ready页面明确风险过滤未核验；坏名单不当空列表通过，保留已认证资产读取。
- [x] G3：真实React Query覆盖closed自动／手动／缓存与enabled正常／错误响应；完整钱包回归和prod类型，新C22源码与历史2525分清。
- [x] G4：新独立revision4生产候选，完整JS/闭包／普通Chrome精确来源／四角色同链与风险提示；保留C21失败和无CA修改。
- [ ] G5：C22真实PersonalKiosk持有／contents／缺图／预览／批准单次执行与原摘要独立native核验；全父合同审核前保持RPC03/22/23/QA06/07开放。

配置包与证书权威不变；没有新链／新发布、没有修改指定RTD debug或SDK业务源码。修复不能以名单关闭状态声称链上安全／风险服务已验收。

已验证子项依据：[Guardian完整回归](./20261006-personal-guardian-verification-01.json)、[C22真实预览](./20261006-personal-current-ui-02.json)、[C22全四角色复核](./20261006-personal-chrome-identity-03.json)。 原父71/98不变，其余未完整验收项保持开放。
