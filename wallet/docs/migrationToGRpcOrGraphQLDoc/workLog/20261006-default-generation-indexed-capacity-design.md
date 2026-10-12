# 新链精确索引后的容量 I1–I5

全扫描候选实际吞吐比1.04不足以扩容；在新scope精确索引镜像下重新测试，不借旧结论。live guard8与六消费加六测试请求产生真实503容量拒绝；新immutable镜像仅CHECKS8→16行改变，七文件（包含索引模块/新catalog proof）逐字节验证，其他全部算法、TLS、VersionId、replica、source及正式水位保持。

- [x] I1：候选02和实际benchmark01；6/12/12/6每组24固定205，全部同SHA通过；genesis、错误路径、未来、缺证书拒绝。12/6平均吞吐比1.268，独立preview容器已移除。首次候选01因COPY继承0700环境下0600文件而无法读取，未安装，失败image/log保留；02明确COPY --chmod=0444，原方案源码未修改。
- [x] I2：installed guard16 单独 image revision，原guard8 image/compose/证据保留；host34测试及live fresh认证通过，consumer仍6、零consumer重启。依据：20261006-default-generation-indexed-capacity-install-01.json。
- [x] I3：新专用adapter明确支持4/6/12，算法/源/TLS/hash/manifest检查完全一致；共享4/6 launcher和4名额分配工具保持。当前实际allocation2+2+2→4+4+4=12，含有限rebuild2最大14≤guard16；仅四owned服务一次停止重启，全部旧intent/config/process/log原字节保留，新Display scope完整保留。
- [x] I4：独立实际持久14HBase/23SQL/Display、两个binding、launcherSHA、所有metadata/完整进程身份、guard16/adapter12/配置4准确审核；冷恢复窗口暂空按合同拒绝；四角色、钱包实际资产与Chrome通过后再记本限定子项。
- [ ] I5：真实连续进展与NFT54771目标覆盖；现有共同窗口仍约15K，仅按实际吞吐记录；source/debug/native/publisher/原scope、所有key/pending保持，父验收继续开放。

[实际capacity03](./20261006-default-generation-query-capacity-03.json)和[独立持久audit01](./20261006-default-generation-query-capacity12-audit-01.json)通过；I4仅已完成DB/metadata/launcher/两binding，冷恢复共同窗口暂空，四角色/资产/Chrome未验，不勾选I4/I5。

后验更新：持久audit02真实14HBase min20094、23SQL及Display/metadata保持，窗口18694–23775与Ledger20099实际交集；capacity12-assets01在S20432十对象原生/归档ID/version/digest/owner/content/previousTransaction及余额比对通过；capacity12-account-roles01四角色/固定0–205原生历史回执、六flags、错误H0/未来/spoof门禁通过；C28-assets-chrome05实际生产完整字节/四入口/资产/账户历史/真实锁定/full journal保持共10检查通过。I3/I4仅该配置范围完成；NFT覆盖、持续吞吐I5和完整QA-A17父合同继续开放。
