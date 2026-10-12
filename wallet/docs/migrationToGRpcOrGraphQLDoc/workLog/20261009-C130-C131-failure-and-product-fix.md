# C131孤立请求关闭修复已完成源码及构建验证

当前新来源为 eaa3bb1d56ba8ac23323127ec92e853530cee304dde8fb8846fb3d0670ae70f1 /1122；旧C124实际资金链路仍是历史独立证据。已完成修复前28项中1项红测、修复后207项/10文件回归、格式化后28项复测、RPC与完整生产类型、三文件完整逆变换（其他1119文件保持）、隔离production构建02、完整编译图及全部JS source-map闭包、两生产源码映射与10条来源拒绝反例。普通UI冷关闭尚未完成，不能记为通过；C130未产生自然pending，四入口及完整非NFT M5仍待。

C130两轮均在Approve前失败，0签名/Execute；普通锁定UI关闭窗口后请求元数据未删除，已定位重启后原监听丢失的产品缺口。修复只在approved=false且无原requestSignals时撤销该请求prepared并串行删除对应元数据，UiConnection等待处理；持久journal/true结果及所有原期限保持。不得删除journal或手工改存储来通过测试。

C129自有三query已stop20正常退出并删除，guard已正常排空停止，独立清理通过；原两组不同H0的RTD/indexer和完整恢复中间件继续保留。新空profile的构建来源与origin已实查，查询服务将在新来源下按原部署脚本重新建立。原89/98，细分剩余9.18%，trial_ready=false；继续先完成所有非NFT一期验收，NFT专项第二阶段。

证据：

- [20261009-C131-before-implementation-01.json](./20261009-C131-before-implementation-01.json)
- [20261009-C131-product-delta-prepared-01.json](./20261009-C131-product-delta-prepared-01.json)
- [20261009-C131-typecheck-01.json](./20261009-C131-typecheck-01.json)
- [20261009-default-generation-positive-C131-build-02.json](./20261009-default-generation-positive-C131-build-02.json)
- [20261009-default-generation-positive-C131-closure-01.json](./20261009-default-generation-positive-C131-closure-01.json)
- [20261009-C131-production-source-independent-01.json](./20261009-C131-production-source-independent-01.json)
- [20261009-C129-owned-query-cleanup-independent-01.json](./20261009-C129-owned-query-cleanup-independent-01.json)

首次构建使用不同SHA的旧profile，被正式release资格拒绝，在编译之前退出；失败01保留。经SHA确认C102原profile后新独立输出02通过，旧产物和development dist均未覆盖。格式检查器两次失败发生在写入之前，原因分别为printer保留尾逗号及SourceFile.text比较原文；随后完整AST忽略trivia/尾逗号及原前缀比较成立、三文件Prettier通过。以上工具失败不冒充产品测试失败或通过。
