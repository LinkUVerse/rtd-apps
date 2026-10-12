# 2026-10-04 四服务开发配置

部署generate_wallet_dev_profile.ts新增必需的账户入口manifest／运行容器／同链绑定核验，accountHistoryUrl从当前native-account-ingress/config.json读取。生成前运行实际WalletAccountHistoryReader，并将完整窗口、分页接纳结果及完整性标志写入coverage.json；账户预检失败就不生成新profile。

运行输出保存在runtime/wallet-profile-20261004-03，revision2，包含Fullnode、GraphQL、Archive及账户历史TLS地址；前三角色身份通过，资产共同快照本次2263，账户窗口与交易数见证据。OriginByte包存在性再次现场核验。旧01／02目录保留。

生成器第四个位置参数可显式指定正整数revision，默认2；更新已安装同ID配置必须选择高于旧版本的数字。输出目录独占创建，不能覆盖旧配置。该CLI不自动保存进钱包或授予权限。

证据：[四服务配置与覆盖](../evidence/20261004-four-service-profile.json)。记录中的水位是带时间观测；之后每次请求仍做覆盖校验。personalKiosk和名称服务未配置、faucet未实测、本机解锁后的权限批准及真实交易流程仍待验，trialReady=false。20/98不变。
