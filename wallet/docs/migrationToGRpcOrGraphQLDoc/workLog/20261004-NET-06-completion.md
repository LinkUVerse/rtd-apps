# NET-06 受控内置网络配置完成核查

## 合同与实现

依据06章：内置网络使用显式、完整、受审查的 NetworkProfile；缺失显示未配置，不按网络标签推导节点／MVR／Faucet。selectBuiltinProfile 对完整 profile 使用 requireComplete 校验，缺 GraphQL、Archive、账户历史任一入口均拒绝；旧 customRPC 单 URL 不参与新版选取。selectNetworkProfile 统一供后台与 UI 使用。

本轮清除 `src/shared/api-env.ts` 已无消费者的 ENV_TO_API 导出，删除四个旧单 URL 环境变量映射。移除前全钱包源码搜索仅命中其定义，没有替代成新的隐式默认值。

实际客户端使用 profile 中的显式端点；transaction-reader 使用绑定 Fullnode 的 transport。identity、entry-access、fullnode、transaction、execution、ledger、graphql-snapshot、account-history、archive-object、archive-checkpoint 的 SDK 构造均设置 `mvr: { url: '' }`，没有默认公网 MVR 解析路径。钱包业务源码未命中 getFullnodeUrl／getFaucetHost／Sui 公网节点 fallback。

useFaucetMutation 仅用 rpc.faucetUrl，缺失禁用；请求前核验入口及当前账户／session，retry=false。profile 拒绝 Faucet 路径前缀、含凭据 URL，Faucet URL 纳入绑定键。此前真实独立开发链 V2 发币与 Fullnode 新 coin 读取证据仍位于 ENV-02；这里不将 Fullnode 身份核验当作 Faucet 自身链身份证明。

## 验证

- 真实当前工作树 profile、profile-registry、Faucet hook、求和四文件58项通过：[日志](./20261004-NET-06-tests-current.log)。首次误用根目录不存在的 vitest 命令退出127，原日志保留，不计通过。
- 清理旧映射后完整钱包 `tsc --noEmit -p tsconfig.json` 退出0：[日志](./20261004-NET-06-wallet-typecheck.log)。
- 四个既有产物静态审计、真实扩展空配置只读状态和当前四服务 profile 证据已分别保存；本轮没有冒充新产物构建或 Chrome 保存批准。

NET-06 规定的配置与默认行为已成立，勾选。自定义权限／保存 NET-07、消费者保护 NET-10、核心 TRY 与动态 REL 仍各自未完成。

## 共享 core 独立基线

为核查 TRY-01 和 NET-10，执行 core 自身完整配置：74条诊断、32文件；只覆盖 moduleResolution=bundler 复验后仍72条、25文件。旧 Kit 和旧 SDK DTO 的导入是主要问题，并非单改解析模式即可修好。两次均退出2，完整日志：[原配置](./rtd-core-typecheck-20261004.log)、[bundler 对照](./rtd-core-bundler-typecheck-20261004.log)。未修改其它应用的旧分支或降低类型检查。钱包自身类型检查通过，不能替代整个共享 core 检查；TRY-01 和 NET-10 继续保留。
