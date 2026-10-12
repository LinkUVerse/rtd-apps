# 浏览器测试环境与账户入口更新

日期：2026-10-04。状态：实质增量；总体仍 18/98。

## 发现与改动

原 Playwright 配置默认执行 `cargo run ... --force-regenesis`，不符合本任务必须采用当前源码 debug 产物、指定部署仓库脚本和保留已有环境的要求。已移除整个链 webServer 与任意启动命令覆盖入口。现在 Playwright 仅管理 demo 服务；链／合约／查询服务须由 link-u-smart-contract/all-in-one-deploy/localDeploy 预先准备并核验。默认不复用已有 demo 进程，避免误用其他 profile；明确设置 E2E_DEMO_URL 才使用外部 demo。

Playwright 收集范围改为 `**/*.spec.ts`，防止误收新增 Vitest demo adapter 测试。链测试使用共享账户，改为单 worker、非并行。支持显式 Chrome-for-Testing executable 与 headless；浏览器清理放入 finally。

faucet helper 移除固定 9123，要求 E2E_FAUCET_URL；只允许 HTTPS 或回环 HTTP，拒绝 URL 凭据与 fragment。这个设置不代替同链身份核验。说明见 tests/README.md。

账户用例修复遗漏的 await importWallet，更新与当前页面不一致的大小写／条款文字。旧 zkLogin 用例伪造 OAuth token 后断言创建成功，与已确定的禁用方案冲突，改为验证明确不支持说明及 Google 入口缺失。

新账户创建用例原要求默认出现余额页；当前 profile 默认未配置，正确行为是保留账户、显示未配置错误、不展示未经核实的余额。改为分别断言可见账户地址、明确未配置状态和余额控件不存在。并未跳过已配置链余额验收；它仍属于 balanceChanges／TRY 的待迁移场景。

## 实际验证

- [发现清单](./20261004-playwright-discovery.log)：27 项／7 文件，没有混入 Vitest 测试；不是执行通过。
- [完整类型检查](./20261004-playwright-types.log)：退出 0（测试环境配置变更后）；后续账户断言更新为 locator 调整。
- [真实 Chrome onboarding](./20261004-playwright-onboarding-final.log)：3 项通过，17.3 秒，覆盖新建、导入、zkLogin 不可用。
- 首轮旧条款／旧余额断言失败日志保留；修正后重跑完整 onboarding。测试账户由隔离浏览器创建，未使用用户已有账户，没有部署或重建链。

## 仍未完成

其他 24 项浏览器场景未因此通过；链场景的 profile 设置 helper、查询入口和真实交易审批／恢复仍待完成。当前验证使用隔离安装的生产扩展产物。没有声称完成动态网络请求审计。

对共享 core 的复核发现已跟踪旧文件／原有 export 未修改，本任务新增 `core/src/rpc` 供钱包显式导入；[已有表面核对](../evidence/20261004-core-existing-surface.json)仅证明源码保留。其他应用仍有旧 Kit 消费者，升级 SDK 后的构建兼容不能据此判定通过，NET-10 继续保留未完成。
