# NET-06：Faucet受控配置与内置profile完整性

日期2026-10-03。上一批已通过构建，本批继续实际网络边界整改。

## 实施

NetworkProfile v2增加可选faucetUrl，采用已有协议／凭据／query／fragment校验，且必须为origin：当前本地SDK requestRtdFromFaucetV2以绝对路径/v2/gas解析，接受路径前缀将静默丢弃前缀，因此拒绝。字段复制冻结，加入networkBindingKey；同H0／generation／账户执行锁不因Faucet变更分裂。

WalletRpcProvider仅向已配置的会话提供显式faucetUrl。Faucet按钮删除API_ENV到固定devnet/testnet/localnet地址的映射，也不再导入SDK getFaucetHost。未配置或无Fullnode会话时不可领币；hook调用前检查账户解锁，调用probeEntryAccess重新验证Fullnode完整H0，预检返回前账户／profile／session变化或组件卸载则不发币。入口限制拒绝时不发送。V2响应和精确金额处理沿用上批实现，不自动重试。

Fullnode身份验证并非Faucet身份验证；Faucet无链身份接口，实际部署对应关系由受控profile保证。两套网络方案已同步说明这一边界与新字段，不宣称Faucet返回身份凭据。

selectBuiltinProfile改为requireComplete校验，内置网络缺任一GraphQL／归档／账户历史入口会显示无效配置，避免内置完整钱包静默降级。自定义显式降级仍由独立profile validator支持；旧单URL不会被自动扩展成新profile。

## 验证

- 4文件49项定向测试通过：profile字段／锁作用域／路径前缀拒绝、Provider回归、Faucet不回退／不重试／错链／入口拒绝／异步切profile拒发。
- 新增3项内置完整性测试后，全量74文件828/828通过：20261003-profile-faucet-full-tests.log。
- 完整TypeScript检查退出0，无诊断：20261003-profile-faucet-typecheck.log。
- 上批dev/prod构建与产物审计对应上批源码哈希，本批未重新构建；不把旧产物冒充含新配置代码。
- 本批未执行实链Faucet、dev部署或Chrome扩展。

## 未完成

NET-06／07保持未勾选。自定义界面仍需多入口编辑、预检结果展示、用户确认、background持久保存和所有后台读取点接入；三入口权限及dApp chain映射也需同步。当前无默认可用dev profile，不能宣称可试用。下一批继续上述主链工作。
