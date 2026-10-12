# RPC-09构建依赖与实时解析完成核验

日期：2026-10-04。

## 当前调用合同

WalletTransactionReader为每次prepare／simulate建立同链Fullnode gRPC客户端，校验完整H0及读前后水位，禁用默认MVR端点，限制超时、取消、64次调用预算并拒绝执行服务的非模拟请求。prepare复制Transaction数据，不继承调用方可执行build插件；新SDK resolver以正式模拟解析Move调用、对象引用、gas price／budget／payment及expiration。随后固定bytes复模拟，验证原生effects／digest／sender及BCS一致，显式指定的gas／赞助／expiration约束不能被静默替换。

独立getMoveFunction映射MovePackageService/GetFunction，getReferenceGasPrice和getProtocolConfig映射LedgerService/GetEpoch；当前钱包准备路径无需逐项调用这些独立方法。协议规则由Fullnode正式模拟验证，不能为了“替换方法名”而增加旧RPC，也不能改从资产展示快照取得交易gas。

本轮在线核对[Sui固定gRPC Core源码](https://raw.githubusercontent.com/MystenLabs/ts-sdks/3c32c302625c7d4c63cd89597c34b86bcccdbcea/packages/sui/src/grpc/core.ts)的resolveTransactionPlugin与独立Core方法，并读取本地SDK对应实现。双方迁移映射表把“当前SDK必发逐项查询”修正为旧基线与新路径的明确区分。

## 实际链上读取／模拟证据

新增scripts/probe-live-staking-resolution.ts从已保存profile读取同H0节点，只允许GetServiceInfo和SimulateTransaction。构造含UnresolvedObject(0x5)、SplitCoins和系统request_add_stake的未解析交易，正式prepare得到真实SharedObject引用和gas配置，再对相同批准bytes模拟。无私钥、签名或dispatch。

实际3次模拟：首次结构化交易、gasSelection=true；后两次固定BCS、gasSelection=false；全部checks=ENABLED（proto枚举数值0）。gasPrice=1000，gasBudget=4419224。只读模拟摘要84cdFDecoDFxwYuStp2vuNyj6wrjyuR8ANqgLX4r6MFu不是已提交交易，不能用于声称链上质押发生。证据20261004-live-resolution.json／.log。脚本由tsx执行，不声称包含在钱包tsconfig检查范围内。

## 检查

- transaction-reader、coin-transfer-preparation、staking-preparation三文件74项通过，另实际NFT准备文件42项通过，共4文件116项，见RPC-09-tests.log和RPC-09-nft-tests.log。首次测试命令中误列nft-preparation.test.ts不存在，后已对实际nft-transfer-preparation.test.ts补跑，不将不存在项算作执行。
- 当前源码和最终四入口产物静态审计通过，RPC-09-built-audit.json。当前生产代码没有新增修改，最近完整钱包tsc与构建证据仍为metadata-stale批次，不冒充本轮重建。
- 覆盖sender错误、插件不继承、模拟失败／trailer失败、取消／会话失效、gas／字节约束及多类业务准备；不是全部协议feature组合或Chrome验收。

RPC-09接口与构建依赖迁移核验完成。RPC-14／15和TX仍负责完整批准、签名、提交及持久恢复；本项不代替它们，不改变试用未就绪状态。
