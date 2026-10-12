# E4 真实上下文写入接入与有限验收

按[实施前清单](./20261006-context-mutation-design.md)完成 worker 惰性单次启动、strict pending/revision 前置屏障，以及网络/权限/会话材料、账户/来源事务、旧格式导入、首次库初始化、UI 清除/密码替换、onInstalled 旧格式重置入口。UI 间接导入账户类不会启动 epoch。失败不清未知；原 backup 恢复失败现在明确抛出，不能在恢复未确认后宣布数据库初始化成功。

嵌套 source.save 分别等待另一准入数据库 begin，再执行自己的 Dexie 写入；complete 后异步结束自己的 pending，abort/失败保留未知。业务外层在完整 Dexie transaction promise 成功后结束。没有全局 nesting 跳过，没有 import 时启动或内存准入。session 存储缺失明确拒绝写入和删除。

| 验证 | 实际结果及边界 |
| --- | --- |
| controller/NetworkEnv 定向 | [02日志](./20261006-context-mutation-unit-02.log)，2 文件 28 项；并发启动一次、UI 拒绝、各阶段失败、invalid review 不创建屏障、屏障失败零 storage/changed |
| 原生 Chrome | [04证明](./20261006-context-mutation-native-04.json)，47 项；1201 个实际 compiler 输入逐文件 SHA；真实 local/session storage、账户/来源增删选择、密码替换/清除以及 held receipt 失效 |
| 嵌套事务 | source.save 返回后、调用者 commit 前仍有 pending；旧结果拒绝；真实 commit 后清除；真实 abort 回滚行且保留未知，后续出口继续拒绝 |
| 全量/类型 | [03全量](./20261006-context-mutation-full-03.log)，173 文件 2452 项；[04类型](./20261006-context-mutation-types-04.log)实际退出 0、无诊断 |
| 最新生产 | [build](./20261006-context-mutation-production-build-01.json)/[audit](./20261006-context-mutation-production-audit-01.json)：1090 份源码 SHA444a0d2005a51ad982894bcad9501a9d25cf22caf8fd7daff92009ec308be12e；4 JS chunk、5792 模块记录、2009 源码；原 dist 全文件 C16 保持 |
| 汇总绑定 | [01审核](./20261006-context-mutation-verification-01.json)210 当前输入；原 C16 和 E3 源码通过保存的逐文件字节精确重建，历史动态结果不得用来证明当前源码 |
| 环境只读 | [SQL](./20261006-context-mutation-sql-observation-01.json)22 原水位最低507801，Display 0–507806/507807 markers，严格 coverage 合同通过；不称共同 S 或首次历史失败已修复 |

原生验证仅新专属 fixture profile 内正式命名的数据库；private permission save 和 UI password/clear 分支由具有调试权限的 harness 调用真实函数，不能称真实审批 UI/native UI 来源授权通过。只使用公开固定测试熵及不可签名 dummy 账户数据，1 个 public dummy、0 HTTP/服务请求、0 签名/Execute/证书改变，原钱包 profile/journal 未写。onInstalled、旧格式导入及 backup restore 的真实原数据组合仍待 E7；网络 custom confirm 已测合同单元，真实多服务预检仍须正常 CA/当前服务证明。

失败全部保留：编辑辅助脚本首轮注释引号导致解析失败；native01 将 esbuild 的生成 define 虚拟输入当文件，修正后只排除精确虚拟名并用 launcher/metafile 绑定；native02 缺少与 webpack 相同的 Buffer，13 项通过后在 session 加密入口失败，补充真实 buffer 包注入；full01 新 Sentry 导入触发原隔离 test mock 缺 getManifest，取消该不必要 import，结束失败只记录固定无数据日志。native03 47 项通过后格式化的三份旧源码已精确重建并核对其原 SHA 保留，native04 对格式化后的当前字节再通过。所有失败日志/编译物/专属 profile 留存，不覆盖失败。

E4 状态写入有限证明完成；来源断连/请求取消监听持续到实际出口仍与 E5/E6 组合。E5 真实签名私有通道、E6 产品入口/CSP、E7 新稳定产物/UI/worker/原七 journal/实链签名继续。父任务仍58/98，trial_ready=false，不用上述47项关闭父 NET-04/TX-01/TX-10。
