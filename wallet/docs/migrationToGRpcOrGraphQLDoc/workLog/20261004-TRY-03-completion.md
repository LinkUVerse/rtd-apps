# TRY-03 完成：实际扩展四条核心 dApp 链路

2026-10-04。按 Task.md 原范围：连接授权／sign-only／execute／PersonalMessage 核心 Chrome 验证。四条链路均有实际扩展证据，本项完成；TRY-04 故障恢复、TX-10 全授权矩阵及正常 CA／自定义权限仍未完成。

## 最新实际执行

`20261004-dapp-execute-live.log` 退出0，Chromium 153.0.8010.12，headless 实际 unpacked extension，现代 Kit demo 通过真实内容脚本／Wallet Standard／后台／批准页。

- 原独立公开测试账户：0xa0ccc8bcc83f6c628340134f8546a21e0618fd1aaa02432bba454c4a2c2233da；使用上轮一次 faucet 资金，本轮不再领币。
- 本轮只签名摘要 5D9uGZt4VTYcMantdM6JEoQMJ4ztZaB9LH6BGnSBain；批准页摘要与返回bytes一致，TransactionData签名验证通过。
- 执行摘要 **5yEbxH4Ex5GUhQ1LwEWPrvQqcwppJGByLHiiuQUcBL4j**，requestId a23506aa-8ade-4ae1-b1f9-f77a449f7c73。demo拆分1个最小单位发送给自身，消耗本地测试gas。
- 真实批准后 modern Kit 返回 Transaction 分支，摘要与批准页一致；从其JSON展示恢复交易BCS，重新计算摘要并验签；effects BCS中的transactionDigest一致、status=Success。
- Chrome真实IndexedDB仅1条journal记录，requestId／digest对应，state=confirmed-success，receipt.success=true、source=fullnode、epoch=2。checkpoint=null如实保留，不编造已入checkpoint高度。
- ExecuteTransaction共 **1** 次，SimulateTransaction共 **10** 次（含只签名和执行准备／最终模拟）。执行后仍完成消息拒绝、未授权账户拦截、disconnect、锁定／错误密码／解锁，以及整个浏览器关闭重启；同摘要confirmed-success记录保留，没有再次执行。
- 连接有HTTP风险继续和账户授权；PersonalMessage批准验签与拒绝无签名结果均通过。上一轮独立证据见20261004-dapp-live-personal-message.md和20261004-dapp-sign-only.md。

## 持久保留与未确定提交纪律

执行模式与原临时只读／只签名模式区分：固定私有目录 `~/.local/state/rtd-wallet-migration/dev-20261003-01/dapp-execution-browser-01`，mkdir非recursive，已存在就拒绝启动，禁止重置重跑。批准前wx写attempt.json记录摘要、请求、origin；Chromium profile和journal永久保留，即使失败也不删除。

本次成功记录已保存confirmed.json；测试密码仅在该目录0600私有文件中以便恢复，不进入仓库、不输出；签名和私钥不写执行日志。原deployer两笔pending完全未动。未来故障测试应复用保留profile并先核对已有记录，不能换目录绕过pending。

脚本：scripts/test-extension-account-lifecycle.cjs，scripts/lib/test-dapp-personal-message.cjs，scripts/lib/test-dapp-execution.cjs。执行开关 RTD_TEST_DAPP_EXECUTE=1 只用于这一次固定目录的测试；不应重复运行该新建模式。

## 验证范围

本批仅扩展验证脚本、文档变化；业务产物沿用上轮完成构建／静态审计的版本，未重复声称新构建。当前源码HEAD与tracked diff再次核对一致；debug二进制刚在上轮重新验证，既有指定源码debug环境未重启、合约未重部署。

- 上轮最终全量117文件1253项、钱包tsc、开发Webpack及四入口审计通过。本批script语法检查和实际完整运行通过。
- UI SHA256 d22896c9e2db6360793c59b920e12084beb73edf7deb05d891fcd4fb16135102；background SHA256 cfd3c81ca32f0ea723c84ca8c837f3d20d63d0c5efc651ec108775f815f37910，与上轮一致。
- 本轮GraphQL S67118对测试账户仍0余额；执行使用实时Fullnode，未依赖滞后索引资金。不是GraphQL新资产追平验收。
- 保留编译Local profile03 revision2与精确dev leaf SPKI例外；正常CA、自定义权限UI、主人的人工试用未验证。
- 浏览器重启后已确认记录保留，不等于“提交结果丢失／popup关闭／worker中断”的故障恢复测试。TRY-04、TX-04／07／10／12不因本次勾选。

TRY-03完成后总体 **37/98（37.8%）**，trial_ready=false。
