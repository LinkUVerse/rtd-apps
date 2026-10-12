# RPC-06／07 元数据刷新失败撤下旧精度

日期：2026-10-04。

继续核查发送／质押余额消费端时发现，useCoinMetadata直接返回React Query结果，重新读取失败后仍可在data取到上次成功的decimals。useFormatCoin自身会隐藏失败值，但直接使用metadata.data的SendTokenForm可继续创建金额验证schema；仅靠格式化显示错误不足以阻断这一路径。

共享core/src/rpc/coin.ts改为在isError时data=undefined，同时保留错误与查询状态。发送表单既有decimals缺失分支会阻断表单；质押既有元数据检查继续有效。未将失败转换为null、默认9或零精度。明确null和合法decimals=0的原合同保持。

使用真实WalletRpcProvider、WalletAssetReader、React Query与GraphQL夹具，先成功读取，再对同一coin-metadata缓存键失效刷新并注入依赖错误。新增测试修改前失败，实际仍暴露decimals=9（metadata-stale-before.log）；修改后旧精度撤下、isError保留、金额未知。5文件65测试通过，包含金额精度、真实hook集成、Fullnode余额、发送准备和质押页面。

完整钱包tsc、dev Webpack与最终四入口产物静态审计通过，证据前缀20261004-metadata-stale。core完整检查仍17项错误，与前一批诊断逐行一致，没有新增错误但仍不代表core通过。

双方主方案同步补充刷新失败语义。本批没有新增链上交易、Chrome或全量测试，RPC-06及试用门槛仍未完成，已完成RPC-07的缺陷在本批修复闭合，不扩大完成范围。
