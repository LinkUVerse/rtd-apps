# 当前交易详情 package 类型兼容修复

当前78/98，新的Display V2发布04在旧交易只读复核阶段失败；没有新目录/pending/签名/模拟/Execute。首次01路径缺失、02旧pending无digest字段、03Fullnode明确裁剪失败也完整保留，均未新发交易。

04通过实际同链钱包ledger.lookup确认后，details在objectTypes规范化触发dynamicType('package')拒绝。依据[Sui官方Object proto](https://github.com/MystenLabs/sui-apis/blob/main/proto/sui/rpc/v2/object.proto)，包对象使用精确字面package，Move对象使用StructTag。当前RTD proto与SDK core相同规定；这里不是降低BCS/回执校验，而是分离协议包标记与Move TypeTag。

- [x] L1 留存原ledger-reader及测试原字节，接受精确package标记；其它类型仍严格dynamicType解析，不扩大错误类型接受范围。
- [x] L2 原生产reader正式测试覆盖包标记与Move对象同时出现、畸形类型拒绝；真实Fullnode/归档旧发布详情与原BCS复核恢复通过。
- [x] L3 全量单测、完整类型、新独立production构建/闭包及实际UI/worker字节；C25原产物保留，不冒称旧Chrome即新构建证据。
- [x] L4 两套方案的包类型语义相同、workLog/current-state/totalProgress按实际更新；不因本修复自动勾RPC-03或其他父任务。

完成范围与原失败记录见[完整日志](./20261006-ledger-package-completion.md)，78个原父任务完成数保持。
