# C196 只读取证修复已完成

旧C148探针打开无关余额CF，在实际C159库读取时因未合并WAL报Merge requires operator，C195失败原件保留。新命名C196 debug二进制只打开default/$watermark/$chain_id，key codec、四水位和四链身份/BCS回编码完整保持，原生产源码/八debug服务/C148工具不变。

- [当前debug构建](./20261010-C196-readonly-watermark-probe-build-01.json)：通过，指定源码/依赖固定。
- [确定性回归1/1](./20261010-C196-readonly-watermark-regression-01.json)：活动primary含余额merge WAL，旧全CF secondary失败，新子集secondary完整读取，余额不变。仅一次测试，没有操作生产primary。
- [真实41持久水位](./20261010-C196-retained-all41-watermarks-01.json)：SQL23/HBase14/Rocks4，最低181923，数据回放25.6386%。
- [真实4查询](./20261010-C196-retained-query-window-01.json)：原H0/genesis、consistent原生BCS、GraphQL十范围完整帧，窗口12686–181974。
- [独立审核](./20261010-C196-retained-query-window-independent-01.json)：上述原始正文、全部SHA与运行36actor/116容器、10篡改反例通过。报告中的23个snapshot单测来自原C160历史报告且源事实核对，不声称本轮重新执行23个单测。

官方依据：[RocksDB secondary列族子集](https://github.com/facebook/rocksdb/wiki/Read-only-and-Secondary-instances)。无需重放不相关余额列族，未设置忽略WAL/错误、未合成水位、未改运行服务、未清库。

只完成取证工具及当前数据观察。QA-A17/QA-A20完整数据、两账户/物理归档/冷WAL/浏览器换代仍未完成。父项91/98、签名恢复12/12、细分剩余7.14%保持；totalProgress仅重放数据观察由旧1.78%更新为25.64%。
