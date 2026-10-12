# dApp后台固定bytes执行命令

日期：2026-10-03；RPC-15／TX继续推进，整体未完成。

新增executeDappPrepared，经UiConnection和BackgroundClient暴露。请求需execute模式，后台消费原批准凭据，使用原bytes／digest／browser origin进入WalletExecutionCoordinator。复用已有正式模拟、签名验证、持久pending屏障、一次dispatch与终态落盘；输入不接受UI替换bytes。confirmed返回原bytes、实际签名、digest和effects BCS；pending只返回原摘要及记录ID。其它请求的pending结果不能误报为本次。历史终态缺本次内存signature时明确要求查原始结果，不重新签名补造。

现代返回字段已核对当前本地rtd-ts-sdk/packages/wallet-standard/src/features/rtdSignAndExecuteTransaction.ts，继承SignedTransaction且effects为base64 BCS。旧WalletStandardInterface仍解析rawTransaction并取第一个签名，尚待替换。

新增7项适配层测试，相关6文件63/63通过（包含已有真实协调器13项测试）。新适配层测试使用受控coordinator，不能独自证明数据库／节点行为。完整钱包107条类型诊断，与此前一致，无新增模块直接诊断。证据为20261003-dapp-execution-tests.log与typecheck.log。

剩余：执行redux和新旧Wallet Standard消息桥尚未接此命令，历史终态原始签名查找、断连与多签等继续完成；没有实链或扩展运行证据，不可试用。
