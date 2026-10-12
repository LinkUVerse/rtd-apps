# ENV-06：剩余连接／流／消息预算实施计划

ENV-05已完成。当前固定镜像实际日志表明没有全局downstream连接上限；upstream32活动请求、16排队及8连接不能限制所有客户端连接。先保存设计，沿原审核renderer和实际same-chain绑定推进，不改publisher、索引或watermark。

- G1：新增候选bounded renderer，严格复用原精确路径、mTLS、origin、min／内部头规则及无重试，只额外限制128全局downstream连接及每HTTP2连接64流。候选与原运行renderer分离，原部署暂不改变。
- G2：固定原Envoy镜像加载并运行全部30项协议检查；附加真实空连接过载测试，证明超额关闭与释放后恢复。HTTP2流限制及响应消息另有直接证据才能计完成。
- G3：核对当前RTD debug原生编码限制、SDK响应解码与流大小。请求4MiB buffer、连接buffer和原生单消息长度是不同合同，不能互相替代；必要原生修改先遵守rtd AGENTS并重编最新debug，当前旧来源冻结直到完整可恢复升级成立。
- G4：在指定合约部署仓库编写受控bridge预算升级，要求旧manifest／renderer／镜像／只读挂载与最新debug守卫、通过的候选证据、独立intent及原字节backup；只升级bridge，不重启publisher或写链，不更改原CA／origin／白名单。升级后fresh审核＋原同链20请求，不确定终态不重复部署。
- G5：双边合同、Task、workLog、总体进度按实际层次更新；ENV-06仅在所有预算与部署持久化验收成立后勾选。原先30／20协议完成不会自动提高此项。

[Envoy官方active connections](https://www.envoyproxy.io/docs/envoy/latest/configuration/operations/overload_manager/overload_manager#limiting-active-connections)和[DownstreamConnectionsConfig](https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/resource_monitors/downstream_connections/v3/downstream_connections.proto.html)明确该monitor为全局活跃连接限制，未配置时无全局上限。官方latest仅作合同依据，实际支持须由固定镜像验证。
