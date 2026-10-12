# NET-10 Explorer SDK类型出口兼容

## 实施

在修复共享core源码解析后，用TypeScript checker核对当前SDK两个模块的真实exports，仅迁移旧client入口不存在、jsonRpc出口存在且原本为type-only的命名导入。49个文件、61处类型引用改为显式 `import type ... from "rtd-typescript/jsonRpc"`。具体文件与名称见20261004-explorer-type-imports.json。

这保留Explorer现有数据模型，不把旧JSON DTO混称现代gRPC模型；没有新增运行时JSON-RPC客户端、没有改钱包服务选择或恢复旧Kit。无法在当前SDK中找到的指标类型没有猜造声明，也没有用any压过。

## 验证

- 完整Explorer tsc从191项变为140项，退出2：20261004-explorer-type-imports-typecheck.log。错误总数减少51，但不代表每个已迁移类型的消费代码都正确。
- TS2305从118项（源码解析后）减为57项；TS2322从6增为34项，因为恢复实际类型后检查到此前被缺失类型掩盖的赋值问题。剩余错误均保留，不删文件、不缩小tsconfig范围。
- 修改前本批49个源码文件均无工作区修改；逐文件以Git HEAD原文对比当前源码，按Explorer实际compilerOptions使用TypeScript transpileModule，49份生成JavaScript全部逐字相同。证据20261004-explorer-type-imports-runtime-check.json；这是编译输出等价证据，不是浏览器运行验收。
- 本轮仅修改Explorer纯类型导入，没有重复钱包全量测试或声称Explorer构建成功。

## 尚待

NET-10仍未完成：core旧Kit13个导入、Kiosk Network与数据合同，以及Explorer旧Provider／SDK指标类型和剩余类型消费仍需修复。RPC总体仍30/98，试用门槛未成立。
