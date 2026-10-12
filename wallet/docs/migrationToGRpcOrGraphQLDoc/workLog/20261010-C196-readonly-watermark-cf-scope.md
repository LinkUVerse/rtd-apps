# C196 实际水位只读探针修复

C195重建41管线取证01失败：旧探针打开全部列族，在secondary重放余额merge WAL时缺少merge operator。没有更改主数据库或运行中消费者；旧失败保留。

RocksDB官方明确secondary允许列族子集，必须含default：[官方契约](https://github.com/facebook/rocksdb/wiki/Read-only-and-Secondary-instances)。新探针仅打开default、$watermark、$chain_id，仍完整读取四条水位、四条链身份、原key codec及BCS逐字节回编码。没有忽略错误或使用metrics代替持久数据。

新命名debug二进制，保留C148原二进制/脚本/证据；指定rtd源码及依赖版本固定，不修改生产源码。确定性测试：活动primary中保留余额merge WAL，旧全CF secondary确实失败，新子集secondary读取四水位/链ID并核余额不变；另用实际C159重建库与原36actor/116容器前后核验。

本修复只恢复取证能力，不代表709569全回放或QA-A17/A20完成。
