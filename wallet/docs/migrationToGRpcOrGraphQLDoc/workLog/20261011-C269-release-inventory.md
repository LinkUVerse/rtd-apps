# C269：最终审计的当前源码与证据入口

本轮完成来源盘点：21个旧RPC全部有当前源码锚点；TypeScript AST发现6个路由文件中的54个Route声明；14份主方案、原98父项、A01–A22及10份普通Chrome局部审核报告均已关联。106个当前RPC模块与C257已安装产物的源码映射逐字一致。

[完整机器清单](./20261011-C269-release-inventory-01.json)保存文件/行号/SHA和原报告scope；[原文及合并完整性核对](./20261011-C269-document-preservation-01.json)确认14份原文副本SHA、原归档文件保留、01–14连续编号、原章节覆盖与21/22任务映射。安装指南在原验收后有维护，`historicalGuideBytesUnchanged=false`已如实记录，不把旧指南审核套用为当前完整安装验收。

## 当前21个旧RPC落点

下面编号来自08对照表，不等同Task中的实施子任务编号。源码锚点仅供定位；本表不把源码存在视为全部业务验收通过。

| 08编号 / 原方法 | 当前来源 |
| --- | --- |
| RPC-01 `rtd_getObject`<br>`getObject` | [asset-reader.ts:303](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/shared/rpc/asset-reader.ts:303)；[fullnode-reader.ts:208](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/shared/rpc/fullnode-reader.ts:208)；[archive-object-reader.ts:60](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/shared/rpc/archive-object-reader.ts:60) |
| RPC-02 `rtd_multiGetObjects`<br>`multiGetObjects` | [asset-reader.ts:303](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/shared/rpc/asset-reader.ts:303)；[archive-object-reader.ts:60](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/shared/rpc/archive-object-reader.ts:60) |
| RPC-03 `rtdx_getOwnedObjects`<br>`getOwnedObjects` | [asset-reader.ts:233](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/shared/rpc/asset-reader.ts:233) |
| RPC-04 `rtdx_getCoins`<br>`getCoins` | [fullnode-reader.ts:384](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/shared/rpc/fullnode-reader.ts:384)；[asset-reader.ts:233](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/shared/rpc/asset-reader.ts:233) |
| RPC-05 `rtdx_getAllBalances`<br>`getAllBalances` | [fullnode-reader.ts:302](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/shared/rpc/fullnode-reader.ts:302)；[balance-reader.ts:50](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/shared/rpc/balance-reader.ts:50) |
| RPC-06 `rtdx_getBalance`<br>`getBalance` | [fullnode-reader.ts:257](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/shared/rpc/fullnode-reader.ts:257) |
| RPC-07 `rtdx_getCoinMetadata`<br>`getCoinMetadata` | [coin-metadata-reader.ts:23](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/shared/rpc/coin-metadata-reader.ts:23) |
| RPC-08 `rtdx_getDynamicFields`<br>`getDynamicFields` | [asset-reader.ts:351](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/shared/rpc/asset-reader.ts:351) |
| RPC-09 `rtd_getTransactionBlock`<br>`getTransactionBlock` | [ledger-reader.ts:156](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/shared/rpc/ledger-reader.ts:156) |
| RPC-10 `rtd_executeTransactionBlock`<br>`executeTransactionBlock` | [execution-reader.ts:215](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/shared/rpc/execution-reader.ts:215)；[execution-coordinator.ts:51](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/shared/rpc/execution-coordinator.ts:51)；[execution-journal.ts:13](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/shared/rpc/execution-journal.ts:13) |
| RPC-11 `rtd_dryRunTransactionBlock`<br>`dryRunTransactionBlock` | [transaction-reader.ts:425](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/shared/rpc/transaction-reader.ts:425) |
| RPC-12 `rtdx_queryTransactionBlocks`<br>`queryTransactionBlocks` | [account-history-reader.ts:69](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/shared/rpc/account-history-reader.ts:69)；[indexed-lists.ts:62](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/shared/rpc/indexed-lists.ts:62) |
| RPC-13 `rtdx_queryEvents`<br>`queryEvents` | [indexed-lists.ts:83](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/shared/rpc/indexed-lists.ts:83) |
| RPC-14 `rtdx_resolveNameServiceAddress`<br>`resolveNameServiceAddress` | [name-reader.ts:113](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/shared/rpc/name-reader.ts:113)；[name-reader.ts:140](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/shared/rpc/name-reader.ts:140) |
| RPC-15 `rtdx_resolveNameServiceNames`<br>`resolveNameServiceNames` | [name-reader.ts:120](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/shared/rpc/name-reader.ts:120) |
| RPC-16 `rtdx_getLatestRtdSystemState`<br>`getLatestRtdSystemState` | [staking-reader.ts:96](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/shared/rpc/staking-reader.ts:96)；[fullnode-reader.ts:418](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/shared/rpc/fullnode-reader.ts:418) |
| RPC-17 `rtdx_getStakes`<br>`getStakes` | [staking-snapshot-reader.ts:145](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/shared/rpc/staking-snapshot-reader.ts:145)；[staking-reader.ts:89](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/shared/rpc/staking-reader.ts:89) |
| RPC-18 `rtdx_getValidatorsApy`<br>`getValidatorsApy` | [staking-reader.ts:261](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/shared/rpc/staking-reader.ts:261) |
| RPC-19 `rtd_getLatestCheckpointSequenceNumber`<br>`getLatestCheckpointSequenceNumber` | [fullnode-reader.ts:436](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/shared/rpc/fullnode-reader.ts:436)；[entry-access.ts:69](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/shared/rpc/entry-access.ts:69) |
| RPC-20 `rtdx_getReferenceGasPrice`<br>`getReferenceGasPrice` | [transaction-reader.ts:425](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/shared/rpc/transaction-reader.ts:425)；[core.ts:502](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-ts-sdk/packages/typescript/src/grpc/core.ts:502) |
| RPC-21 `rtd_getNormalizedMoveFunction`<br>`getNormalizedMoveFunction` | [transaction-reader.ts:425](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/shared/rpc/transaction-reader.ts:425)；[core.ts:877](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-ts-sdk/packages/typescript/src/grpc/core.ts:877) |

## 全部声明路由

包含主页面、账户、dApp批准、设置和嵌套子路由。以下是源码中的局部path声明，不能跨文件直接当作完整URL；重定向及容器也列入，不能把54个Route说成54个独立业务页面。

| 来源 | path / index | element |
| --- | --- |
| [src/ui/app/components/menu/content/index.tsx:52](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/components/menu/content/index.tsx:52) | `"/"` | `{<WalletSettingsMenuList />}` |
| [src/ui/app/components/menu/content/index.tsx:53](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/components/menu/content/index.tsx:53) | `"/network"` | `{<NetworkSettings />}` |
| [src/ui/app/components/menu/content/index.tsx:54](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/components/menu/content/index.tsx:54) | `"/auto-lock"` | `{<AutoLockAccounts />}` |
| [src/ui/app/components/menu/content/index.tsx:55](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/components/menu/content/index.tsx:55) | `"/language"` | `{<LanguageSettings />}` |
| [src/ui/app/components/menu/content/index.tsx:56](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/components/menu/content/index.tsx:56) | `"/theme"` | `{<ThemeSettings />}` |
| [src/ui/app/components/menu/content/index.tsx:57](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/components/menu/content/index.tsx:57) | `"/more-options"` | `{<MoreOptions />}` |
| [src/ui/app/components/menu/content/index.tsx:58](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/components/menu/content/index.tsx:58) | `"*"` | `{<Navigate to={menuHomeUrl} replace={true} />}` |
| [src/ui/app/index.tsx:124](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/index.tsx:124) | `"restricted"` | `{<RestrictedPage />}` |
| [src/ui/app/index.tsx:125](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/index.tsx:125) | `"/*"` | `{<HomePage />}` |
| [src/ui/app/index.tsx:126](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/index.tsx:126) | `"apps/*"` | `{<AppsPage />}` |
| [src/ui/app/index.tsx:127](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/index.tsx:127) | `"kiosk"` | `{<KioskDetailsPage />}` |
| [src/ui/app/index.tsx:128](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/index.tsx:128) | `"nft-details"` | `{<NFTDetailsPage />}` |
| [src/ui/app/index.tsx:129](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/index.tsx:129) | `"usdc-promo"` | `{<UsdcPromo />}` |
| [src/ui/app/index.tsx:130](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/index.tsx:130) | `"nft-transfer/:nftId"` | `{<NftTransferPage />}` |
| [src/ui/app/index.tsx:131](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/index.tsx:131) | `"nfts/*"` | `{<AssetsPage />}` |
| [src/ui/app/index.tsx:132](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/index.tsx:132) | `"onramp"` | `{<OnrampPage />}` |
| [src/ui/app/index.tsx:133](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/index.tsx:133) | `"receipt"` | `{<ReceiptPage />}` |
| [src/ui/app/index.tsx:134](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/index.tsx:134) | `"send"` | `{<TransferCoinPage />}` |
| [src/ui/app/index.tsx:135](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/index.tsx:135) | `"send/select"` | `{<CoinsSelectorPage />}` |
| [src/ui/app/index.tsx:136](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/index.tsx:136) | `"stake/*"` | `{<Staking />}` |
| [src/ui/app/index.tsx:137](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/index.tsx:137) | `"tokens/*"` | `{<TokenDetailsPage />}` |
| [src/ui/app/index.tsx:138](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/index.tsx:138) | `"transactions/:status?"` | `{<TransactionBlocksPage />}` |
| [src/ui/app/index.tsx:139](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/index.tsx:139) | `"*"` | `{<Navigate to="/tokens" replace={true} />}` |
| [src/ui/app/index.tsx:141](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/index.tsx:141) | `"accounts/*"` | `{<AccountsPage />}` |
| [src/ui/app/index.tsx:142](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/index.tsx:142) | `"welcome"` | `{<WelcomePage />}` |
| [src/ui/app/index.tsx:143](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/index.tsx:143) | `"add-account"` | `{<AddAccountPage />}` |
| [src/ui/app/index.tsx:144](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/index.tsx:144) | `"import-passphrase"` | `{<ImportPassphrasePage />}` |
| [src/ui/app/index.tsx:145](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/index.tsx:145) | `"import-private-key"` | `{<ImportPrivateKeyPage />}` |
| [src/ui/app/index.tsx:146](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/index.tsx:146) | `"manage"` | `{<ManageAccountsPage />}` |
| [src/ui/app/index.tsx:147](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/index.tsx:147) | `"protect-account"` | `{<ProtectAccountPage />}` |
| [src/ui/app/index.tsx:148](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/index.tsx:148) | `"backup/:accountSourceID"` | `{<BackupMnemonicPage />}` |
| [src/ui/app/index.tsx:149](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/index.tsx:149) | `"qredo-connect/*"` | `{
						<PageMainLayout>
							<Outlet />
						</PageMainLayout>
					}` |
| [src/ui/app/index.tsx:157](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/index.tsx:157) | `":requestID"` | `{<QredoConnectInfoPage />}` |
| [src/ui/app/index.tsx:158](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/index.tsx:158) | `":id/select"` | `{<SelectQredoAccountsPage />}` |
| [src/ui/app/index.tsx:160](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/index.tsx:160) | `"export/:accountID"` | `{<ExportAccountPage />}` |
| [src/ui/app/index.tsx:161](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/index.tsx:161) | `"export/passphrase/:accountSourceID"` | `{<ExportPassphrasePage />}` |
| [src/ui/app/index.tsx:162](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/index.tsx:162) | `"forgot-password"` | `{<ForgotPasswordPage />}` |
| [src/ui/app/index.tsx:163](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/index.tsx:163) | `index` | `{<ForgotPasswordIndexPage />}` |
| [src/ui/app/index.tsx:164](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/index.tsx:164) | `"recover"` | `{<RecoverPage />}` |
| [src/ui/app/index.tsx:165](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/index.tsx:165) | `"recover-many"` | `{<RecoverManyPage />}` |
| [src/ui/app/index.tsx:166](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/index.tsx:166) | `"warning"` | `{<ResetWarningPage />}` |
| [src/ui/app/index.tsx:167](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/index.tsx:167) | `"reset"` | `{<ResetPasswordPage />}` |
| [src/ui/app/index.tsx:170](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/index.tsx:170) | `"/dapp/*"` | `{<HomePage disableNavigation />}` |
| [src/ui/app/index.tsx:171](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/index.tsx:171) | `"connect/:requestID"` | `{<SiteConnectPage />}` |
| [src/ui/app/index.tsx:172](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/index.tsx:172) | `"approve/:requestID"` | `{<ApprovalRequestPage />}` |
| [src/ui/app/pages/home/apps/index.tsx:83](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/pages/home/apps/index.tsx:83) | `"/connected"` | `{<ConnectedAppsCard />}` |
| [src/ui/app/pages/home/apps/index.tsx:84](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/pages/home/apps/index.tsx:84) | `"/:tagName?"` | `{<AppsPlayGround />}` |
| [src/ui/app/pages/home/assets/index.tsx:17](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/pages/home/assets/index.tsx:17) | `"/hidden-assets"` | `{<HiddenAssetsPage />}` |
| [src/ui/app/pages/home/assets/index.tsx:18](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/pages/home/assets/index.tsx:18) | `"/:filterType?/*"` | `{<NftsPage />}` |
| [src/ui/app/pages/home/tokens/index.tsx:12](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/pages/home/tokens/index.tsx:12) | `"/"` | `{<TokenDetails />}` |
| [src/ui/app/pages/home/tokens/index.tsx:13](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/pages/home/tokens/index.tsx:13) | `"/details"` | `{<TokenDetailsPage />}` |
| [src/ui/app/staking/home/index.tsx:29](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/staking/home/index.tsx:29) | `"/*"` | `{<Validators />}` |
| [src/ui/app/staking/home/index.tsx:30](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/staking/home/index.tsx:30) | `"/delegation-detail"` | `{<DelegationDetail />}` |
| [src/ui/app/staking/home/index.tsx:31](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/src/ui/app/staking/home/index.tsx:31) | `"/new"` | `{<StakePage />}` |

## 当前证据与剩余缺口

10份报告保留各自真实构建版本和范围：C243设置/账户/应用只读访问，C248连接/反例/取消/消息及只签名，C249资金执行，C250当前余额，C253质押执行，C258 NFT执行，C259 dApp执行，C262/C265隐藏恢复及正文补验，C266网络URL/迟到响应隔离。此次只索引这些报告及SHA，未递归重验其全部输入，不能升级成当前所有功能完全通过。

| 原父项 | 尚须实际完成 |
| --- | --- |
| QA-A15 | 当前名称正向/默认反向、变更/过期/缺失与最终收件人UI；等待新鲜正式索引。 |
| QA-A17 | 完整709570回放、数据比较/WAL及当前完整换代矩阵；C266只完成URL/迟到响应子范围。 |
| QA-A20 | 当前全部dev保留数据冷启动、依赖次序与普通Chrome journal保持；不打断活跃发布子进程。 |
| REL-02 | 当前名称正向、NFT写后索引、新仓位/赎回等未覆盖业务；原C256未知操作只按原digest恢复。 |
| REL-05 | 前述必需项通过后，逐份证据/当前源码/页面进行完整终验；本盘点不能替代。 |

P269-1完成。原98项仍93/98；清单标记只是Task的当前声明，不是本脚本重新证明了93项全部合同。没有修改业务代码、发起交易或增加扫描负载。
