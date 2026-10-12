# 本地外部附加服务边界与C12验证

按照[实施前设计](./20261005-local-external-services-design.md)完成编译开关、后台feature三入口、Analytics初始化／URL／退出、Sentry边界。默认关闭，production且显式WALLET_EXTERNAL_SERVICES=true才开启；空feature沿用原默认值，不替代网络／交易权威。八份[原字节](../evidence/20261005-local-external-services-before/manifest.json)保留。

7新合同／169文件2379项完整钱包测试与类型通过；[1080产品稳定构建](./20261005-local-external-services-build-01.json)通过，146当前来源精确冻结并替回八原文件、移除两新增文件重建C11。C11完整32产物保存。四入口wire与Provider审计通过；wire首轮使用不存在的执行器失败，保留日志，正确执行器02通过。

[实际fresh Chrome](./20261005-local-external-services-browser-01.json)执行UI5e2ef652与worker4b96e027均逐字匹配，四入口200／同H0。有限启动观察pending0／fault0；请求origin只有四个本地服务，外部0、模拟／Execute0、页面错误0。该runner本轮尚未增加外部零请求断言，结果记录与后续证据审计核验零数值；不将本轮启动流量当作全部业务抓包。

[原七journal](./20261005-local-external-services-original-journals-01.json)实时effects／逻辑SHA保持，0模拟／重发。[随后实际只签名失败](./20261005-local-external-services-sign-only-failure-01.json)发生在准备阶段，0模拟／广播；保留profile，通过惰性manifest文档[只读原native库](./20261005-local-external-services-sign-failure-native-01.json)确认24范围pending1／fault0，不删票据。C11此前成功只保留历史范围，不能提升为C12成功。

独立质押实际只读探针失败，原日志私有保留，未得到可验收输出，不能记为非空仓位通过。后续[计时器生命周期设计](./20261005-identity-deadline-design.md)修正一个可重复的旧超时误伤；旧失败原因不一概归为同一个问题。

[受保护回放](./20261005-local-external-services-replay-01.json)连续0–360871，原22水位与最新debug保持，PID66145仍运行且没有终态；未restart／resume。完整试用、normal CA与原父缺口继续，50/98保持。
