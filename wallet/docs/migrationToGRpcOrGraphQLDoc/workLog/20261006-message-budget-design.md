# ENV-06 G3：响应单消息预算与最新debug修订

原Tonic 0.14.6编码默认usize::MAX，RTD服务未设置发送上限；固定源码finish_encoding先压缩后按消息体长度检查，超额OutOfRange，5字节frame头不计。官网示例默认描述不能替代固定源代码。当前SDK读取无硬frame上限；钱包所有实际客户端配置binary，能力HTTP已有限预算。

M1 保存当前RTD lib字节及32文件debug来源身份；为Fullnode七个常规服务／subscription和archive Ledger／Move加同一64MiB发送消息体硬上限。保持Zstd可协商、默认4MiB请求解码、所有read mask／分页／min与无重试。这个限制在编码后，压缩时限制压缩后长度；不声明是handler对象分配／解压膨胀保护。
M2 直接Tonic编码body测试精确边界、超额OutOfRange无超额DATA、stream前缀与终态、Zstd区别；使用真实默认64MiB的超额样本验证。有限codec测试不冒充实际运行节点。
M3 钱包binary响应在SDK读入之前检查5字节frame声明长度，消息≤64MiB、trailers≤64KiB、单调用累计≤128MiB；解析跨chunk且声明超额即取消body，不先等body到齐。拒绝压缩DATA／无效flag与text，保留上游错误和Abort，不重试。全实际wallet客户端统一接入，正常stream不会被整包buffer。SDK仓库只读。
M4 定向／完整类型与回归、最新源8 debug独立构建。安装需要新的受控原字节／intent／process ownership与只读数据守卫，完成前当前运行debug仅称旧32文件修订，不称最新修改源。
M5 与G4桥接预算升级一起完成持久部署／同链及双方文档验收；原publisher、索引持续运行，不能手改水位或删除pending。父53/98保持，真实资产／交易试用门槛继续。

固定依据：[Tonic0.14.6 codec源码](https://docs.rs/tonic/0.14.6/src/tonic/codec/encode.rs.html)、[Tonic server API](https://docs.rs/tonic/0.14.6/tonic/server/struct.Grpc.html#method.max_encoding_message_size)。Sui原生服务只作为基准，RTD限额为明确本地策略，不改共识／BCS或宣称Sui已有相同上限。

执行调整：辅助重编实际三摘要变化，因此M5原“publisher持续运行”假设不成立；改为协作暂停、原字节备份、安装并按原参数恢复，保持pending／epoch／缓存。详细实际终态及失败均见[收口](./20261006-ENV-06-completion.md)，不将最初假设覆盖为已验证条件。
