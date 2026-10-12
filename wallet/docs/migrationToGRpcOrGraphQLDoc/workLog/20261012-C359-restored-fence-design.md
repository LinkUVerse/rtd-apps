# C359：仅恢复历史 fence 的只读归档交付合同

已恢复归档 SQL 完整8表及固定对象版本，但目标 MinIO 保护桶没有对应历史 fence 记录。C350拒绝无epoch写入并不表示该记录已经保真恢复。C359仅将经C140/C352/C354全量校验的唯一历史 epoch=1、previous=0、owner恢复到独立C120对应桶，SQL/对象/发布上界709569均不变。

使用目标预先配置的coordinator标识，只在确认目标不存在该账号时创建私有临时凭据，策略仅允许该桶的fence控制与版本读取，不允许任何对象读写。恢复通过生产client.activate签名CAS 0→1，重复相同CAS须幂等；错误前置代次/不同owner/非coordinator必须拒绝。历史publisher账号不得被导入、配置或授权；其密钥不读取，原G3身份不改。完成后撤销临时coordinator并删除辅助容器/策略。

这完成历史fence状态的持久恢复和读服务准入，不启动新publisher，也不把历史control_admission当作新写授权。未来若启动新publisher必须走独立可信coordinator、独立新身份和实际存储CAS的后继租约流程；该流程不能由钱包读取测试替代。只有原必需持久、固定版本/副本、真实读接口与浏览器证据完整，才能收口归档恢复子项。单宿主dev范围不宣称分布式HA。
