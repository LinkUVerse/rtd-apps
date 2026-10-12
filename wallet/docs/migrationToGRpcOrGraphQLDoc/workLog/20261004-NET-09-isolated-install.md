# NET-09 隔离安装与类型复验

日期：2026-10-04。

本批继续检查现有SDK软链接与锁文件。创建临时独立工作区，复制工作区／各包清单与锁文件，SDK输入指向当前源码；真实工作区node_modules及运行服务未改动。不是清空全局store的重建，也未运行安装生命周期脚本。

## 已修复的启动阻断

pnpm在筛选wallet前解析所有清单，发现 `rtd-explorer/src/explorer/package.json` 开头存在误入的绝对路径字符串。该内容已在当前HEAD中，非临时目录引入。仅删除 `{` 前无效前缀，未更改任何依赖／scripts字段；全部工作区package.json均通过JSON解析。

初始失败：[日志](./20261003-isolated-install.log)。修复后offline因store缺少wallet-standard tarball失败：[日志](./20261004-isolated-install-after-manifest.log)。随后允许下载、保持frozen-lockfile／ignore-scripts的隔离安装成功，2038包、10个下载、10.3秒：[日志](./20261004-isolated-install-online.log)。不能把offline缺缓存当代码错误。

## 安装成功后继续验证

实际隔离安装SDK2.31.3、Kiosk1.4.13、WalletStandard0.21.27；[包解析证据](../evidence/20261004-isolated-install-packages.json)。实际node导入gRPC与transactions成功：[日志](./20261004-isolated-sdk-import.log)。锁文件仍包含旧noble／scure等依赖组合，需继续核对，安装成功不自动消除该差异。

复制当前wallet／core／icons源码及配置到隔离环境后执行完整tsc，退出码2，仅报core/src/hooks/useZodForm.ts的TS2345：表单Schema为Zod3，resolver所见Schema为Zod4。[类型日志](./20261004-isolated-wallet-types.log)；[从resolver真实路径解析Zod](../evidence/20261004-isolated-resolver-zod.json)。现有工作区类型通过不再能被用作可复现安装证明。

下一步修正解析器Zod依赖关系及当前SDK传递依赖锁定，继续隔离安装／类型／测试／构建；不使用as any绕过，不删除其他应用的合法旧消费者。NET-09／10仍未完成，总体17/98。隔离位置保留于evidence/20261003-isolated-install-location.json供后续复用。
