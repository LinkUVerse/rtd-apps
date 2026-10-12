# 新链 NFT 认证索引与生产读取 N1–N5

沿用98项中的RPC-03/22/23、QA-A07/14/22，不新增父任务。当前钱包C28源码保持。原native seed53967/mint54771签名、原bytes、digest、19对象独立证明存在，但不能替代GraphQL覆盖。

- [ ] N1：SQL正式published>=54771，全部相关SQL/Display、KV Ledger和consistent实际共同窗口覆盖夹具；不使用copyledger、Fullnode高度或补造snapshot代替。
- [ ] N2：真实WalletAssetReader完整分页，源OwnerToken发现OriginByte Kiosk、两个实际NFT、目标空Kiosk及直接NFTserial3。同一snapshot身份、版本/digest/owner/类型/内容与native原回执及当前Fullnode独立比较。
- [ ] N3：生产groupCollectibles对实际OwnerToken/直接NFT的可见、隐藏和非视觉完整分组；不伪造Display/URL，不以内存函数代替Chrome隐藏持久验收。
- [ ] N4：生产appendOriginByteTransfer实际fresh token/Kiosk/NFT，existing-target和create-target两分支；只构造unsigned命令，模拟、批准、签名、Execute和写后读另行验收。
- [ ] N5：当前C28真实Chrome直接NFT/OB内容/隐藏与还原/跨窗口互斥；后续真实批准原bytes转移、链回执和覆盖后刷新单列，父任务全部合同满足才勾选。
