# RPC03 当前 C40 拥有对象完整合同

根据Task原拥有对象复杂筛选／全分页／NFT／隐藏／非视觉／Display／owner页面逐项补证；不替代RPC22全分支转移、TX04竞争、名称或普通HTTPS。

- [x] F1：实际最新源码debug／H0、恢复后ownership、当前C40源码／UI／worker及原受控sender/recipient，固定完整十字段快照／Display，禁止原用户或durable pending profile。
- [x] F2：production reader同S真实default50对pageSize3全分页不可变对象与Display内容逐字节一致；Display历史证明live上界可推进但两字段单独原生验证，其余证明身份与S完全相等，两原账户、非空type精确筛选与缺失类型空集合／BCS／Display／owner，原始请求和分页响应／游标完整；新鲜native checkpoint digest与实际范围审核。Personal原177615之后同S真正空内容／原cap及新鲜native审核。
- [x] F3：当前C40 recipient真实Display NFT owner页面、隐藏／恢复按钮及精确H0/generation/account偏好；renderer及完整Chrome cold重启后偏好保持、正常解锁／重锁、原密文／完整journal保持。正常UI恢复ids[]等价原空偏好，不直接删IDB记录。
- [x] F4：当前C40 sender真实全部非视觉分类及canonical类型／object链接、完整当前owned snapshot；Personal空Kiosk卡片／原cap／空内容页面。比对F2完整数据及当前实际UI请求，不能凭0 NFT文本当完整cap/内容证明。
- [x] F5：独立对原始body／BCS／游标、当前artifact／source map／旧边界、实际native及UI／所有SHA／0新增签名模拟Execute裁定RPC03；全部合同未验完时保持父项开放。

不同generation的旧分页证据保留为历史；本批重新验证G3真实两账户，同S绑定范围，不以原seed自身低于native历史lo否定合法当前S≥T。framework281963未indexed前旧S内容属于过去快照，不能当新鲜链归属。

## 同S分页的Display证明上界

[官方GraphQL查询文档](https://docs.sui.io/develop/accessing-data/graphql/query-with-graphql)的consistent pagination与scope要求每页来自相同checkpoint；[固定Sui consistent-store源码](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-indexer-alt-consistent-store/src/db/mod.rs)区分指定checkpoint读取与实际AvailableRange。RTD额外Display.historyCoverage并非Sui原字段，其连续上界来自每次读取的历史水位，见rtd/crates/rtd-indexer-alt-graphql/src/api/types/display.rs与wallet/src/shared/rpc/display-history.ts。后者已有明确约束：live upper bound允许在多页之间推进，source和S不能改变。

同S分页必须精确比较对象集合、顺序、version、digest、owner、BCS、JSON、Display.output，以及basis模板身份、来源、内容SHA和固定S/digest。只有historyCoverage.lastCheckpoint及其对应lastCheckpointDigest可因服务推进而不同；每份coverage仍须独立符合相同H0/sourceId/history generation、first=0、固定snapshotCheckpoint/digest、last大于等于S，且last的原生checkpoint/digest确证一致。不得因此忽略任何其他字段，不得以较新上界替代固定S，不修改产品proof或响应。整份动态Display证明逐字节相同不是这份语义的要求。

实际生产04、隐藏cold01、sender02、独立raw01／native01及[父合同审核](./20261007-RPC03-current-completion-audit-01.json)全部通过；RPC03完成。其他父项不随之勾选。
