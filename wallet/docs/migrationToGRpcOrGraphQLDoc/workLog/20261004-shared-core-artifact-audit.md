# 钱包产物可达共享 core 核查

增强 `scripts/audit-wallet-provider.py`，核查 ui/background/content-script/dapp-interface 四个既有 JS 及 source map，并记录两者 SHA256。覆盖旧 Kit／jsonRpc 模块路径、旧客户端构造器／查询 hooks／executeTransactionBlock／dryRun／devInspect／queryTransactionBlocks 调用模式。

运行通过。UI source map 含 19 个共享 core 模块，background 含 9 个；全部清单已记录，无上述旧请求器模式命中。共享 core 中供其它应用使用的旧 hooks 不因源码存在就算钱包可达，也未批量删除。现代 `rtd-typescript/client` 的类型与 ObjectError 不等同旧 JSON-RPC 客户端。

证据：[产物审计](../evidence/20261004-wallet-shared-core-artifact-audit.json)。本轮没有重新构建，记录的是既有产物；静态模式检查不能证明动态拼接请求不存在，不能代替抓包、完整 shared core typecheck 或试用安装。TRY-01／RPC-26／REL-02 保持未完成。
