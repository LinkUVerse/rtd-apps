# NET-01 与 NET-02/03/05 局部基础实现

日期：2026-10-03（北京时间）。NET-01 的 profile 合同与定向验证完成；NET-02、NET-03、NET-05 仅局部实现，仍未勾选。尚未接入原业务页面，不代表接口全量迁移或服务就绪。

新增 shared/rpc/profile.ts：v2 三入口与独立账户历史、完整 32-byte H0、generation、revision、同链 package／名称 registry、Wallet Standard chain、只读冻结配置。拒绝短链标识、凭据／fragment／query endpoint、非本地 HTTP、localhost 数字别名；内置完整配置必须有完整入口，两个 Ledger 角色不能误复用同 URL，账户历史不能误用原生 GraphQL URL。缓存绑定含端点与包配置；执行作用域只有 H0 + generation + account，不允许网络别名／URL 绕开同账户互斥。

新增 session.ts：取消底层请求并拒绝底层忽略 abort 后的迟到成功或失败；新会话独立。此模块尚待接入 TanStack、网络设置与实际账户切换。

新增 identity.ts：使用新 SDK raw Ledger.GetServiceInfo 与 GraphQL checkpoint(0) 并行探测三入口，每次构造临时客户端绕开 SDK 身份缓存；禁止 redirect 与浏览器 cookie，禁用默认 Sui MVR。返回身份报告，不返回可执行客户端。已知错链优先于另一个端点不可用；GraphQL partial error／缺 H0／gRPC 缺水位或非法 lower 不接纳。角色暂不可用与错链区分，但能力、SDL、账户历史证书和 package 探测尚待完成，不能将 identity-verified 当 ready。

37 项测试覆盖 profile 的输入边界与作用域、会话迟到拒绝，以及真实 SDK 的 gRPC-Web 帧和 GraphQL 请求格式。特别验证 HTTP 200 + grpc-status 14 仍失败、部分 GraphQL 成功拒绝、错链优先和重复探测不复用旧身份。测试传输使用受控 mock Fetch，**没有访问真实链，也不是 Chrome 扩展验收**。

执行命令（钱包目录）：

- `pnpm exec tsc -p configs/ts/tsconfig.rpc.json --pretty false`：退出 0；仅覆盖新 rpc 模块，日志 20261003-network-typecheck.log。
- `pnpm exec vitest run src/shared/rpc`：3 个文件、37/37 通过，日志 20261003-network-tests.log。
- `pnpm exec prettier --write src/shared/rpc configs/ts/tsconfig.rpc.json vitest.config.mts`：新模块格式化。

修复测试启动配置：原 vitest.config.ts 被按 CJS 加载，无法 require ESM vite-tsconfig-paths；改为 vitest.config.mts。配置限定钱包 tsconfig，避免扫描无关 explorer 旧配置。没有屏蔽钱包类型错误。测试输出仅剩 Browserslist 数据年龄提示，与本轮 RPC 结果无关。

后续：实现可激活的新客户端集合／受限归档 reader、实际能力和覆盖准入、自有 Provider 与领域 Hook；按 NET-07/08/09 连接 UI、storage 和依赖，逐项完成全部 RPC 与 TX，再进行 dev／Chrome 核心验证。当前原 JSON-RPC 业务代码仍待替换，不能宣布试用就绪。
