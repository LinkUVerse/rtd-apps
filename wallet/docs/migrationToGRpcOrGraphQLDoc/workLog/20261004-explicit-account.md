# 显式账户合同修复

2026-10-04，TX-09继续推进。

现代Wallet Standard的三种方法均要求调用方显式account。此前交易sign-only／execute保留了旧适配器默认首个已授权账户的回退；现在在序列化交易／发送消息前读取并校验调用方account.address，缺失、null、非对象、空值、非字符串或非RTD十六进制地址直接拒绝，绝不选择默认账户。PersonalMessage同步得到明确账户错误。这里只做输入检查，后台仍独立验证权限、当前账户与批准绑定，页面检查不作为授权凭据。

测试先复现旧行为失败（20261004-explicit-account-before.log），修复后全量121文件1289项通过（20261004-explicit-account-full-tests.log），钱包类型检查退出0（20261004-explicit-account-typecheck.log），开发Webpack成功46799ms且保留Local profile03 revision2（20261004-explicit-account-build.log）。新产物四入口审计通过（20261004-explicit-account-static-audit.json）。Demo增加Omit account直接边界测试开关，构建通过，不声称独立demo完整类型检查。

代码审计另定位缺省chain仍作为旧兼容接受：dapp-request-binding.test.ts的“兼容未提供chain的旧请求”与现代交易输入要求显式chain不一致。下一步按官方现代输入移除交易缺链回退；PersonalMessage 1.1的chain仍为可选，不能混为一谈。因此TX-09仍不勾选。

## 实际扩展结果

20261004-explicit-account-extension.log进程退出0：三个现代方法省略account均在弹窗前拒绝，零结果；正常PersonalMessage验签、用户拒绝、错链与错误账户拒绝、disconnect仍通过。实际交易只签名摘要F72owJ6fGSXWUgjyjveTbBV5mjRbKHoH6RfHRzigEdzB与批准预览一致，签名验签成功，gasBudget3988000；整轮5次模拟、0次提交。启动与完整浏览器重启后均以CDP确认实际worker源码与磁盘一致。仅dapp-interface入口业务改动，UI和background哈希保持原值是预期结果。

保留编译Local／精确SPKI测试范围，正常CA与自定义权限未验。没有领币、重启dev链、部署或提交交易；四条执行journal保留。本批代码／测试／实际扩展证据不代替下一步交易chain必填修复，进度39/98。
