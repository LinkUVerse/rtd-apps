# RPC-03：真实拥有对象集合及分类核验

2026-10-04。优先核验已索引夹具，没有为了测试重新部署或发送交易。

## 实际查询

新增只读脚本scripts/probe-live-owned-assets.ts，加载现有wallet-profile-20261004-03/profile.json，经真实WalletAssetReader同快照准入、完整ownedObjects收集、owner和唯一ID核验，再调用生产filterOwnedAssets和groupCollectibles。网络仅允许本机GraphQL与GetServiceInfo；不加载私钥、不签名、不提交。输出使用wx，避免覆盖先前证据。

- `20261004-owned-assets-live.json/log`：S55580，0xaaa／0xbbb各1个OwnerToken。包含类型与排除类型联合筛选、互相冲突筛选为空、隐藏后不得出现在可视或非视觉组、特色类型进入可视组均通过。
- `20261004-owned-assets-deployer-live.json/log`：S55655，部署账户13个对象，含Coin、Display对象、Publisher、UpgradeCap及OwnerToken。排除2个Coin后共11个，隐藏所选对象后分组为visual=1／other=9／hidden=1，总数一致。这里的Display类型对象不是直接持有NFT的display渲染验收。
- `20261004-owned-assets-tests.log`：5文件53项资产reader、Hook、NFT分类和隐藏偏好相关测试通过。

脚本已由tsx实际执行；钱包tsconfig不包含scripts，不能把运行成功记为独立脚本完整类型检查。本轮未改变生产业务源码，未重复构建；未执行Chrome页面操作。

## 仍未完成

真实集合最多13对象，未达到reader固定50条页大小，因此不能证明真实多页；受控分页回归亦不代替该证据。直接NFT display、所有页面视觉／交互及RPC-03完整条目核验仍需补齐。

PersonalKiosk实际place交易checkpoint为203097（既有20261004-personal-kiosk-placed-objects.json）。本轮GraphQL可读上界观测从55308至55655，尚未覆盖该交易，不使用Fullnode对象伪造GraphQL固定快照，也不重发或重部署夹具。RPC-22实际钱包发现／转出保持未完成。

共享core完整类型检查本轮重新执行：`20261004-core-current-typecheck.log`仍17项失败，主要旧rtd-dapp-kit导入及旧Kiosk options。未标TRY-01通过。总体34/98，可试用门槛未达到。
