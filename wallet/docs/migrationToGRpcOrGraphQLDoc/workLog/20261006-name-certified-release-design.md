# 名称正式声明的独立认证材料

五模块固定根夹具已经发布checkpoint1014819、seed1015260。只有新package在完整genesis锚定认证前缀中的effects／object BCS与规范发布module字节成立，才可和此前五package声明合并为新profile；原生ABI和根字段验证不代称该认证。

- [x] C1 [独立优化构建](./20261006-optimized-package-export-build-01.json)通过；未修改原offline exporter源码及certified_prefix.rs，当前RTD源码debug候选保留debug symbols／assertions／overflow checks，0安装、0服务信号，八debug及原exporter保持。
- [x] C2 [8项实际对照](./20261006-package-export-benchmark-02.json)通过：两exporter各自验证原OriginByte的24451个checkpoint，完整输出与历史认证同字节；两者均拒绝错H0、错发布摘要、错编译module字节。有限样本候选32.15秒、原87.27秒，不代表百万checkpoint的新名称认证已通过。首轮工具错误期待拒绝文本而退出，保留[失败日志](./20261006-package-export-benchmark-01.log)。
- [x] C3 [完整名称认证](./20261006-name-certified-export-01.json)实际exit0：从原genesis到publish checkpoint1014819，共1014820个checkpoint、8835999笔交易；quorum／原BCS／effects／package与五个编译module仅self地址重定位比对通过。使用原source spec绑定的完整checkpoint目录，未猜测prefix种子；1566.42秒完成，原scope／RTD源码保持，0网络／模拟／签名／Execute。
- [x] C4 [六pin声明](./20261006-name-certified-release-01.log)及独立release audit通过：原五pin与新名称pin合并，共同三个framework pin精确相同，profile revision5；生产verifyReviewedDeployment／selectReviewedDeployment／fresh nameRoot／nameField验证两Table大小5／2，原profile4保留。新材料在私有runtime的certified-name-release-20261006-01；信任摘要dc07111b666c29340571a4e7167f907cbac46378b74931ba5f337e2cb95526a6。随后[隔离生产构建](./20261006-name-production-build-01.json)和[全产物审计](./20261006-name-production-audit-01.json)通过，5277模块／2033源码／7chunk，原dist不变。
- [ ] C5 当前扩展新profile的名称查询／最终发送地址／续期改名／迟到拒绝与抓包验收通过，才能勾QA-A15；未索引或未认证必需项继续开放。

C5 已完成[实际 Chrome lag 拒绝与独立帧审核](./20261006-name-lag-ui-progress.md)：两名称禁用检查、普通地址真实检查启用模拟成功、0签名／派发；仍未完成正面查询和最终目标确认。

C3／C4终态材料已落盘并通过。此前运行中记录保留其发生时间；本次完整认证与静态构建不代称GraphQL名称覆盖、实际Chrome正面查询、改名续期、最终发送地址或QA-A15完成。当前加载实例和原profile4没有被新包替换。

随后在独立保留Chrome profile加载新包，实际扩展ID为pefndneicnccnijblbkllhgcicfpnjak。首轮[UI／worker字节核验](./20261006-name-production-chrome-01.json)成立，但三路HTTP返回403，networkIdentityAccepted=false，未记为身份成功。[后端准入独立诊断](./20261006-name-query-admission-diagnostic-01.json)通过726884的PG／双副本固定版本边界；拒绝来自开发HTTP Origin白名单缺少新扩展ID。[来源核验与绑定](./20261006-name-loopback-origin-01.json)仅替换owned HTTP ingress，保留原八Origin及原配置／CA／TLS上游核验，新增第九Origin，无浏览器原生权限授予。[第二轮实际Chrome四身份](./20261006-name-production-chrome-02.json)均HTTP200／同H0，UI／worker等于构建字节，0公网／禁止请求／页面错误／证书变更；仍是literal HTTP开发例外，不代称原HTTPS CA或名称正面解析。
