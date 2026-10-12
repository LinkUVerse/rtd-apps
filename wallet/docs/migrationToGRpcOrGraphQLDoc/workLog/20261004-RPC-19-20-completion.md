# RPC-19／20 归档与近期同摘要读取核验（2026-10-04）

两项接口编码与合同核验完成；不代表跨worker真实journal恢复、Chrome交互、发布服务全部运维场景验收完成。

## 实现边界

WalletLedgerReader先查询同链Fullnode，近期成功结果不访问归档。仅真实NOT_FOUND且服务报告已裁剪历史区间时，允许按原digest查询显式archive入口；该保留水位不证明目标交易一定被裁剪。服务／权限／协议错误、缺字段、错链不会切换归档。两端缺失仍返回未知，不能解锁或重发。归档成功回执必须有checkpoint并处于经前后H0与水位核验的覆盖内，原始transaction bytes／digest／effects等通过现行回执校验。

lookup用于后台协调器，details接WalletRpc.readTransactionDetails与实际收据hook；不存在时有限轮询／手动刷新，缓存绑定profile和readSession，切网迟到结果不进入新会话。代码扫描未再发现钱包waitForTransactionBlock调用。

历史对象reader只接受objectId＋version，批量保留逐项错误，完整BCS摘要及选择器核验；收据对象详情与effects的版本／digest再次匹配，证据见RPC-01／02日志。

WalletArchiveCheckpointReader只接受明确高度或完整摘要，不允许省略到latest，前后验证H0／水位／覆盖。返回verification=service-reference，是服务定位信息；没有伪造委员会签名、独立checkpoint BCS验证或交易包含证明。此reader是Task规定的受限归档接口，不扩展原先未使用的checkpoint浏览器页面。可信摄取／发布继续由独立服务门禁承担，ENV完整验收单独跟踪。

三个归档reader均使用明确白名单Ledger查询，不允许State／Execution／Name／MVR，且有请求总超时、取消、会话结束检查。

## 真实证据

20261004-live-archive-recovery.json：实际wallet readers使用当前profile03；checkpoint914按高度与摘要查询结果一致。原交易4UBkHPNAax9mP1Q2PfDADpjSmTewNtvwQ2cxeomCh1u6先经Fullnode同摘要查询，再由归档返回成功receipt及details，source=archive、checkpoint=914、digest一致。全部请求路径保存，无签名／执行请求。

该交易定位来自已有账户历史证据20261004-wallet-account-tls.json，本轮没有创造新交易，也没有以另一个摘要替代它。它与此前Hb3LJi6m3wV8HYBYgZmitSwmVTMcwaiNaYsKhpuPTvwf及第二次coin探测无关；不能据此声称那两笔已恢复。

近期Fullnode真实lookup成功的既有证据：20261004-address-funding-execution.json，纯地址资金发送全部后原摘要读取成功。指定历史对象真实23项两批证据：20261004-live-archive-batch.json。

## 自动核验

- archive-checkpoint-reader、archive-object-reader、ledger-reader、execution-reader、historical-effect：5文件74项通过，20261004-archive-contract-tests.log。
- receipt-hooks与execution-coordinator：2文件18项通过，20261004-recent-recovery-tests.log。含未知不重发、会话切换和协调器归档恢复替身验证。
- 本批未改生产代码，未重跑完整构建。新只读脚本已实际执行；Node客户端到TLS gRPC-Web入口不等于Chrome页面或系统CA信任验收。

TX-04～08／TRY等剩余门槛保持未完成，不随接口条目勾选而缩小目标。
