# NET-09 隔离安装的Zod解析修复

日期：2026-10-04。

## 根因与修正

`@hookform/resolvers@3.10.0`的Zod适配器运行时与声明使用Zod3 API，但该包没有声明Zod运行依赖，只有react-hook-form peer。pnpm隔离存储中从resolver真实路径解析到了提升的Zod4.2.1；core自己的schema来自Zod3.25.76，造成TS2345。必须以realpath后的模块路径定位解析结果，不能从node_modules表层symlink路径推断。

root package.json既有pnpm配置中新增精确packageExtensions：仅为`@hookform/resolvers@3.10.0`补`dependencies.zod=3.25.76`。pnpm生成的packageExtensionsChecksum与resolver snapshot新增zod依赖已同步到锁文件。没有改变业务表单，没有类型强转，没有全局把所有Zod4降级。

[官方pnpm依赖配置说明](https://pnpm.io/settings)列出packageExtensions能力；落地配置格式以本机pnpm11.24.0实际安装验证为准。本次该仓库root package.json配置通过frozen校验，单独放workspace.yaml的尝试发生checksum不匹配，失败日志保留。

## 验证

- 隔离frozen安装成功，1.5秒，仅重连9项依赖：[日志](./20261004-resolver-scoped-install-final.log)。
- 同一隔离wallet完整tsc退出码0：[日志](./20261004-resolver-fixed-types.log)。
- 从resolver realpath实际解析Zod为3.25.76；实际zodResolver对合法输入返回值、非法输入返回字段错误：[日志](./20261004-resolver-runtime.log)。
- 同步后断言正式root清单与隔离验证清单JSON相等，锁文件文本完全一致。真实工作区node_modules没有重新安装，不影响现有服务。

## 未同步的完整锁更新

为生成扩展元数据曾在隔离工作区完成全量lockfile-only解析，1106行diff已保存[生成差异](./20261004-generated-lock.diff)。新版SDK确实带来noble/scure/GraphQL17等新依赖，但该更新还将共享core／explorer的旧rtd-dapp-kit替换成无清单的dapp-kit目录包，会破坏其他消费者，且生成临时绝对peer路径。因此没有直接复制全量生成锁文件；本批只同步独立且已frozen安装验证的Zod修正。

完整SDK依赖锁定、现代demo与其他应用兼容性仍待完成，NET-09／10不勾，总体17/98。此修复使隔离类型检查通过，但不等于完整环境／Chrome或试用验收。
