# C114 时间戳有效期合同纠正

2026-10-08。此文纠正此前 C114 工具准备中“时间戳模拟成功后由 UI 禁用”的预期；旧文件和历史／mock／负向证据完整保留，均未证明当前正向 UI 通过。原四路、六场景、全部入口、赞助及 M5 范围不变。

[Sui官方 v2 定义](https://github.com/MystenLabs/sui-apis/blob/main/proto/sui/rpc/v2/transaction.proto)包含 ValidDuring／Validity 的 min_timestamp 和 max_timestamp。字段定义不代表执行支持。[本次读取的 Sui 官方 transaction.rs](https://raw.githubusercontent.com/MystenLabs/sui/main/crates/sui-types/src/transaction.rs)也在任一时间戳非空时返回 Unsupported；当前本地 RTD 对应 transaction.rs:3488 使用相同的明确拒绝。当前 transaction_simulation.rs:131 先执行 validity_check，模拟 RPC simulate/mod.rs:334 将 UserInputError 映射为 InvalidArgument（3）。以当前编译源码和原生完整返回核对实际行为，不能推断成功。

完整内部参数矩阵仍为 54 故障／六收款人更改／282 模拟：120 费用选择、150 成功规范最终模拟、六 Epoch0 真实过期错误13，以及六 unsupportedTimestamp 真实错误3。两类错误均要求完整原请求、实际 grpc 状态／消息／二进制 details；不能用合成状态、错误请求失败或未知错误替代。其他 BCS／effects／source-map／旧 grant／Back 新 requestId／原对象与密文断言保持。

真实有效期 UI 仍为六场景乘九输入，共54请求：24成功规范最终预览、六 Epoch0错误13、24时间戳错误3。时间戳输入在真实生产准备中失败，因此批准按钮禁用、prepared／approval token 不存在，并显示实际模拟失败；不要求伪造 prepared 以显示原 TransactionValidity 的时间约束文案。四种时间戳输入分别是原窗口 min／max 和 ValidDuring min／max。ValidDuringNoTimestamp 必须按实际两个字段皆 null 分类为支持，不能仅凭名称末尾 Timestamp 判断。正常 Reject 后请求和 popup 清理，零签名／Execute、原 journal／密文及十四对象保持。

修正版工具全文逆变换仅纠正上述分类／结果断言、保存正向准入实际时间及源绑定；300秒准入、所有原始帧、原scope、终态归属和业务计量不变。正向审核在实际准入时间验证 freshness，在结束时间证明真实完整结果；不能将长矩阵结束时间当作启动时间，也不能放宽 freshness 窗口。当前父项仍89/98、细分剩余9.18%、trial_ready=false；P114-3及后续实机矩阵仍开放。
