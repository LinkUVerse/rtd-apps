# 2026-10-04 账户 TLS 入口与真实非空钱包历史

start_wallet_account_ingress.py以固定nginx digest部署独立TLS39606/account/graphql，每个POST经过39592 GraphQL准入，再访问私有WSGI39605。客户端请求头不整体透传，发布上界和请求ID由代理覆盖；仅当前实测扩展Origin获得CORS响应，不允许凭据；16KiB请求体、明确路由和超时。私有CA／server key留在runtime，不改变系统信任。

账户API源绑定以--refresh-worker-source受控更新：仅允许token_index_worker.py一个文件变化，其余reader/schema/port均一致才核对归属、SIGTERM、保留旧记录并重启。新master PID83299，无重建DB或更换身份。

首次nginx配置验证因长扩展Origin要求更大的map bucket失败，未启动；保留原配置，改为128后通过。首次钱包探针在未启动时连接拒绝，不能记为通过。后续实际钱包WalletAccountHistoryReader经TLS入口读取窗口100–1471，返回1条真实交易，覆盖及完整性flag复核通过；registrationComplete/allAccountActivityCertified/allAccountTransfersCertified均false，不宣称全历史完整。

预检测试发现limit_except POST误拒绝OPTIONS；改为显式允许POST OPTIONS，语法验证后reload。紧接reload的首个请求仍命中旧worker而失败，随后独立请求复验：批准扩展Origin得到204及准确Allow-Origin；未批准Origin得到204但无Allow-Origin；未知路径404。证据：[钱包TLS历史](../evidence/20261004-wallet-account-tls.json)、[入口策略](../evidence/20261004-account-ingress-policy.json)。HTTP策略证据不等于Chrome页面已完成账户历史验收。

公开账户入口已可进行后续集成，仍须将其纳入新的当前profile观测、验证持续追赶和真实钱包UI。总体20/98。
