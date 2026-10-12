# TRY-02／QA-A01／QA-A22：实际扩展导入、锁定和重启验证

日期：2026-10-04。使用 Chromium 153.0.8010.12、最新开发版扩展、全新独立临时浏览器目录；结束后清理仅本脚本创建的临时目录。公开确定性测试密钥，无资产、不部署合约、不发交易、不使用真实用户密钥。

## 真实运行发现与修复

新增 `scripts/test-extension-account-lifecycle.cjs`，真实扩展 UI 填写私钥与密码表单。最初定位错误将 Radix 条款复选框视为 input，修正为准确按钮选择器。随后账户行为断言已通过，但页面存在未处理的 Zod 校验异常；最初粗粒度阶段标记将其误标为重启／解锁失败，细化诊断后确认账户持久化和解锁正常。

当前钱包安装 zod 4.2.1，core resolver 3.10.0 只按 Zod 3 的 errors 结构处理失败；钱包账户表单根导入实际获得 Zod 4，产生正常必填校验的未处理拒绝。最初八处账户表单／校验 helper 改为 `zod/v3`，运行验证通过，但跨安装副本的类型推导出现 TS2589。最终改为共享 core 的 useZodForm 模块同时导出 z，所有账户表单从同一模块获取 schema 构造器；保证与 resolver 使用同一安装的 Zod 3。没有吞掉校验异常或降低字段规则，也未新增依赖安装。

[Zod 官方版本入口说明](https://zod.dev/v4/versioning)明确 Zod 4 根入口变为 v4，v3 应显式使用 `zod/v3`。本轮未改链协议合同。

## 最新证据

- `20261004-extension-account-lifecycle-final.log`：通过。UI 导入与密码设置；SDK 地址一致；实际 UI-background 命令锁定；错误密码保持锁定；正确密码解锁；关闭完整浏览器再启动后同一账户保留并锁定；再次解锁通过；页面无 pageerror。日志包含实际 UI 与 background bundle SHA-256。
- `20261004-account-zod-full-tests-final.log`：115 文件 1239 项通过，含新增实际表单 hook＋resolver 的空值／格式错误／合法私钥回归。
- `20261004-account-zod-build-final.log`：最终开发版 Webpack 构建成功，54446 ms。
- `20261004-account-zod-static-audit.json`：新产物四入口静态审计通过。
- `20261004-account-zod-typecheck-final.log`：最终钱包类型检查结果；新增测试类型声明曾造成 TS2589，保留在 `20261004-account-zod-typecheck-before-test-type-fix.log`，测试句柄改为明确 UseFormReturn 后仍有跨副本推导问题，最终通过共享 core 统一 schema 来源解决；最终钱包及 core 类型检查通过。
- 所有选择器、诊断和修复前失败日志保留，特别是 `20261004-extension-account-lifecycle-zod-failure.log`，不把它们记为通过。

## 验收范围

这是实际安装并加载的无界面 Chromium 扩展，不是组件 mock。导入和密码设置通过 UI；锁定与解锁使用真实扩展 UI-background 消息，未验收对应按钮的界面交互。没有网络 profile、链资产读取、签名、交易、原生权限弹窗、助记词创建／恢复／派生或双账户试用。

TRY-02、QA-A01、QA-A22 仍保持未完成；总体不因局部证据新增完成项。下一步继续补同链资产／发送及 dApp 核心交互，不能用本脚本替代这些验收。
