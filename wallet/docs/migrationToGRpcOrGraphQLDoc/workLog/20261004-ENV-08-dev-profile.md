# 2026-10-04 ENV-08 当前绑定开发配置

新增 link-u-smart-contract/all-in-one-deploy/localDeploy/generate_wallet_dev_profile.ts，使用实际wallet validateNetworkProfile、WalletReadSession、probeNetworkIdentity及WalletAssetReader。输入为明确runtime目录、部署fixture清单和新的输出目录，不从旧文档端口推导当前服务。

生成前核验：runtime H0／generation／debug binary路径绑定；两个代理的manifest内容SHA与实际运行容器；GraphQL／bridge绑定同链。端口读取当前ingress配置与bridge compose，Fullnode/faucet读取runtime.json。记录debug二进制SHA和服务manifestSHA，不输出密钥。

实测三角色fullnode／graphql／archive均verified；实际共同快照100、余额和5个账户对象通过；OriginByte发现／执行包经Fullnode GetPackage重新确认存在，模块frozen_pub/kiosk/ob_kiosk。ABI功能证据沿用独立fixture链路，本轮不重复宣称实链转移。

新输出目录：/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261003-01/wallet-profile-20261004-02，包含profile.json与coverage.json。第一次01版本保留，不覆盖。证据：[当前配置观测](../evidence/20261004-ENV-08-dev-profile.json)。生成命令使用NODE_EXTRA_CA_CERTS明确私有CA，未关闭Node TLS验证。

明确限制：accountHistory未配置；personalKiosk／name服务未配置；faucet地址仅由runtime绑定，本轮未请求领币；浏览器host permission批准及正常CA信任未验；覆盖100不表示追上当前Fullnode，不能用旧coverage作为后续实时准入。profile revision1只适合首次导入；修改已有同ID配置需按钱包规则递增版本。

ENV-08只结项“按当前绑定生成profile和覆盖”这一原任务。完整试用仍由RPC/TX/TRY及其它ENV条目约束，trialReady=false。总体20/98。
