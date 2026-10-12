# NET-04／TX-01：最终动作准入本轮收口

F1–F5按[实施前设计](./20261006-final-admission-design.md)完成编码与有限验证。原生runIfClear在readonly事务get成功事件同步检查具体依赖并启动动作；异步动作不占用事务，结果在事务完成后才交付。后台内部／dApp实际Execute fetch在身份等待之后接入门槛，缺门槛拒绝发送；只签名开始与结果交付分别检查。保持原journal先落盘、只读恢复与未知终态不自动重发。

[有限证据总核验](./20261006-final-admission-verification-02.json)实际exit0：163当前来源、1082产品来源、24保留源码及128历史产物文件摘要一致；当前产品SHA c5393724763ef879714baf3791593e656a617b03a709c2df1d2cc13429c9b603。7文件189定向、170文件2408全量和完整类型通过；[原生33项](./20261006-final-admission-native-02.json)覆盖已提交Fault、排队写入、异步动作释放事务、存储失败与动作启动后abort未知结果，实链／模拟／签名／Execute均0。

[稳定C15构建](./20261006-final-admission-build-01.json)UI f4fd3523318ac3c6e484d77a582ca9fb2d34485df6da59b1d8474b05614217ae、后台0f0f5dc847cabe702c52d571f54e83c90fb0344065ade0576ba7d1599192f570；[真实fresh Chrome](./20261006-final-admission-browser-02.json)UI／worker逐字匹配，native pending0／Fault0、外部0。Fullnode／归档／GraphQL同H0；账户HTTP200没有完整覆盖，不称四入口ready。仅精确三证书SPKI，不替代正常CA。

[原七journal惰性核验](./20261006-final-admission-original-journals-01.json)两个原profile逻辑摘要不变、7只读查询、0模拟／Execute。[真实当前扩展只签名](./20261006-final-admission-sign-only-01.json)3正式模拟、固定BCS／预览摘要与Intent验签通过，Execute0；保留隔离profile，资产快照未接受、新广播未授权。不能把builtin只签名升级为完整Move／权限／外部dApp出口验收。

原有失败完整保留：reader-reproduction-01的29通过／2新增失败；native-reproduction-02缺新方法；native-01不存在record夹具；targeted-04缺显式模拟门槛；browser-01参数错误、wire-01脚本路径错误；verification-01文件路径拼接优先级错误。修正后分别使用新编号日志，未覆盖失败，原生失败profile保持。native-reproduction-01仅旧26项基线通过，不能称竞态复现。

完整外部dApp消息返回仍有popup清理await，尚未证明真正消息出口竞态；独立发布pin／服务签认、正常CA、原未知交易恢复、完整批准与账户资产实链继续。NET-04／TX-01仍开放，53/98（54.1%），trial_ready=false。RTD源码／8 debug／运行桥接／publisher／watermark未修改；连接预算候选33项仅未部署验证，详见[ENV-06](./20261006-ENV-06-connection-verification.md)。
