# C365 完成后的恢复临时环境清理

必须先取得 C363 的 QA-A17.6/.9 完整通过证明，再执行指定部署目录中的 retire_wallet_C365_completed_recovery.py。执行时重新核对 immutable 容器ID、镜像/config/mount SHA和精确进程出生身份；当前只读预检13容器、6个主进程及1个账户worker均匹配。

范围包含 C120六个中间件、C139 HBase代理、C330副本、C351恢复guard、C355三个入口，以及已完成重放的C231/C293 guard；进程为C353三个Rust reader、C355 admission/account和C293 adapter。停机先公开入口、账户与查询进程，再认证/代理、HBase/PG/ZK/MinIO。Docker使用无限正常停机等待，不允许超时强杀；观察超时不等于退出。

清理仅删除已停止容器。全部named volume、bind数据、配置、证书、原错误及证据保留；任何镜像仍被其他容器使用即保留。唯一wallet helper镜像仅在零容器引用时清理。G3/G4原链、当前C51账户/journal和 rtd-archive-events-hbase3 不在清理范围，清理前后逐身份核对。

此文为准备，不计 REL-05.7 通过。实际清理及当前G4业务复核证据形成后另行收口。
