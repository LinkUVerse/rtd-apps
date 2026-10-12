# dApp后台交易准备与授权复核

日期：2026-10-03；RPC-15／TX授权实现增量，整体不勾选。

新增background/dapp-preparation.ts，命令只接受requestId与accountId，不接受页面指定交易原文或服务URL。复用执行账户生命周期，读取当前后台请求，检查未批准、三小时有效期、真实绑定、账户一致和当前viewAccount／suggestTransactions权限。Fullnode准备后再读请求与权限、复核账户，拒绝撤权、失效请求和合法新绑定替换原文。准备器自身承担Fullnode身份与正式模拟检查，本批通过mock隔离该已有层。

UiConnection已接命令，BackgroundClient已有匹配响应校验。withExecutionAccount改为导出复用；其原签名／恢复边界未改动。

验证：新增13项后台准备测试和2项通信测试；本批相关4文件35/35通过，含原11项执行和5项请求入口测试。完整钱包107条类型诊断，与上一批相同；新准备器、通信类型及新测试没有直接诊断。日志为20261003-dapp-background-preparation-tests.log和同前缀-typecheck.log。上一批717项整组未在本批重复，不能描述成本批整组732项通过。

剩余：批准页仍用原准备hook，尚待切换；没有批准token注册／消费、断连绑定或现代dApp签名执行接入。此只读准备响应不是签名授权。下一步接入后台批准bytes登记与页面预览，再以该登记执行同字节签名并逐次复核权限。未启动dev、部署合约或做Chrome实链验收；当前不可试用。
