# RPC-03／23 NFT详情属性改用显式JSON展示合同

日期：2026-10-04。

NFTDetailsPage原先将json强制断言为旧metadata.fields.attributes.fields布局，keys直接.map，values强制当字符串。现代原始Move JSON的metadata.attributes没有旧包装，零值／false交给LabelValueItem会被其truthy判定隐藏；畸形keys／values则可能使属性区域异常或错误配对。

新增nftAttributeRows展示解码器，支持现代布局和已有旧布局，先验证属性向量类型／长度，再生成全部字符串值。零、false、null、嵌套JSON均明确显示，大整数串保持原值；不合法向量展示原始顶层结构而非造属性对应关系。重复属性标签保留，React key含索引。非对象根、不可序列化值不被当作业务属性；非有限数不冒充null。

页面移除旧NftFields强制类型断言和metaKeys/metaValues索引拼接，统一渲染解析后的属性行。此处只处理展示，未改变BCS持有核验、hasPublicTransfer或正式模拟授权。

3文件18项最终测试通过：属性解码、NFT实际hook集成和持有关系hook。覆盖两种JSON布局、零／false／null、大整数、嵌套结构、畸形向量、重复标签、非法根和值。首次测试命令另列不存在的nft-assets.test.ts，未计为执行；最终只列实际三个文件，证据20261004-nft-attributes-tests-final.log。

钱包完整tsc最终通过，见typecheck-final.log（统一前缀20261004-nft-attributes）。双方主方案已同步展示合同；本批未进行Chrome／实链NFT新交易，RPC-03／23仍保留，不新增完成勾选。

最终dev Webpack与四入口产物静态审计通过，见同前缀webpack.log／built-audit.json。未重跑全量回归，不把之前全量计数当成本次修改后结果。
