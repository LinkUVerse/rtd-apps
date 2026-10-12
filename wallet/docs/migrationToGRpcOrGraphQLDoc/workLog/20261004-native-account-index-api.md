# 2026-10-04 独立账户数据库与私有 API

initialize_wallet_account_index.py校验认证前缀manifest、同链和当前GraphQL准入，复用archive的账户schema/importer：独立rtd_account_wallet_certified数据库，OwnerToken／能力导入者与只读查询角色分离。角色／配置注册至foundation账本，密码与游标签名密钥仅存私有runtime。原查询、发布、旧diagnostic库不改。

OwnerToken和能力0–100根索引导入成功。ConfiguredAccountHistory.connect实际核验5项高权限标志、schema与表／列写权限，查询角色通过。实际GraphQL各依赖与索引覆盖交集为100–100，allAccountActivityCertified=false；不能把原始索引0–100直接当成可查历史0–100。

start_wallet_account_api.py以当前账户Python源码／schema／reader SHA绑定，在loopback39605启动WSGI。首次gunicorn --preload worker收到SIGSEGV，HTTP断开；保留before-preload-repair记录，仅对完整参数匹配的自有进程SIGTERM并移除preload后重启，当前master PID49717。取消预加载避免父进程预先建立数据库/TLS连接；崩溃原因仍应视作该环境下的定位推断，真实修复证据为后续重复请求成功。

连续两次真实HTTP覆盖请求成功；实际WalletAccountHistoryReader读取deployer地址，复核同链／覆盖／快照并完成分页，结果100–100、0条交易，完整性标志保持false。此为窄窗口空页真实接入证据，不替代包含转移／NFT／Kiosk交易的验证。

证据：[独立索引](../evidence/20261004-native-account-index.json)、[HTTP API](../evidence/20261004-native-account-api.json)、[钱包读取器](../evidence/20261004-wallet-account-history.json)。公开TLS账户入口、持续增量worker、非空完整历史和Chrome页面均待完成。20/98保持不变。
