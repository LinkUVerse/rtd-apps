# TX-01：最终bytes有效期展示及批准守卫

2026-10-04。审查发现后台固定expiration，但dApp批准页原来只展示gas、命令和输入，没有有效期。本轮新增中英文TransactionValidity卡片，从prepared.bytesBase64解析，不从可变原始交易取值。支持None、Epoch、ValidDuring、Validity，并显示后者的委员会epoch和允许提议者索引。

Sui官方源码https://github.com/MystenLabs/sui/blob/main/crates/sui-types/src/transaction.rs与本地rtd/crates/rtd-types/src/transaction.rs核对：Epoch包含上界；ValidDuring的时间戳目前未实现；Validity的委员会限制仅针对指定epoch。没有把提议者索引当身份或永久限制。

新增测试发现SDK bcs.ts的Epoch采用unsafe_u64：9007199254740993被舍入为9007199254740992。本轮UI对不安全Epoch显示读取失败，并在批准按钮和onSubmit双处拒绝继续；非空尚未支持的时间戳限制也拒绝批准。没有宣称此UI防护已修复SDK底层精度，后续仍需处理。初版测试另有chain夹具错误使用base64，已按实际ObjectDigest改为32字节base58。

## 验证

- `20261004-validity-preview-tests-before-fix.log`保留初版4失败（3个chain夹具、1个真实Epoch精度发现）。
- `20261004-validity-preview-tests.log`最终3文件16项通过：8项实际BCS+React静态渲染／批准判定，5项模拟预览和3项i18n回归。包括None、合法Epoch、超安全范围拒绝、零epoch、Validity提议者及时间戳不支持。不是Chrome交互验收。
- `20261004-validity-preview-typecheck.log`完整钱包tsc退出0。
- `20261004-validity-preview-build.log`最终webpack成功，现有样式警告保留。
- `20261004-validity-preview-static-audit.json`最终四入口静态审计通过。

生产改动为批准页与中英文文案，未提交实链交易、未改后台一次dispatch规则。双方技术方案、Task和totalProgress同步；TX-01仍未完成，总体34/98，不能试用验收。
