# RPC-22／NFT 当前完整链路实施合同

当前父71/98，余27，trial_ready=false。原C21源码f867a8d4、原七profile、原genesis和既有debug／服务保持。revision3已配置OriginByte，原生Kiosk与PersonalKiosk未配置；原PersonalKiosk发布／种子／放入不可重跑。所有新部署操作只使用link-u-smart-contract/localDeploy、指定RTD最新源码debug；不把服务HTTP探测当作独立pin权威。

- [x] K1：原Axoi发布摘要归档成功／checkpoint201271，受控genesis至201271连续认证证书、事务／effects／事件／输出对象引用，六模块只还原self-address后与原编译字节匹配，独立原源码／干净上游与原发布ABI核对。
- [x] K2：与原OriginByte认证导出对齐三个genesis包完整BCS和模块pin，形成五包独立声明；新revision4精确绑定，原revision3保留，验证改pin／错binding拒绝及真实新包比较。
- [ ] K3：最新产品新profile独立生产候选及实际Chrome加载全JS字节，不改旧dist；真实受控owner私钥导入／local，当前snapshot发现非空PersonalKiosk、原生能力／OriginByte，两类holding与contents、owner／childField／类型／缺图展示。
- [ ] K4：对应Native／PersonalKiosk／OriginByte实际准备与批准、最终BCS／gas／expiration、once Execute＋原摘要恢复和strict journal；必须按每种支持路线实测，未配置或条件不足不勾。
- [ ] K5：直接NFT Display与hidden／undo／跨账户和profile隔离、非视觉／risk／不支持状态真实UI，补足RPC-03／RPC-23／QA-A06／A07；所有仍未执行分支明确保留。
- [ ] K6：动态字段／动态对象真实双向多页／name BCS／值及childId、历史／缺失／错误owner，实际与夹具分层，不发布半页。
- [ ] K7：完整路径源快照、失败／pending保留、新原digest独立Ledger／签名／effects及必要定向验证，双侧文档同步。
- [ ] K8：按原RPC-03／22／23和QA-A06／07逐合同审核，当前父状态与totalProgress实时更新；不能用单条路线或模块／包读替代完整迁移、普通HTTPS或完整试用。

首次只读定位得到原发布checkpoint201271（广播时原receipt checkpoint=null保持），原缓存0／201271实物存在；这一步尚不证明整个前缀或独立新pin。原已有源／binary可复用，仅在其当前HEAD／diff／输入及八个debug精确绑定仍相同时执行离线导出。全程没有新签名／模拟／广播。

已验证子项依据：[离线连续证书](./20261006-personal-certified-export-01.json)、[官方六源码](./20261006-personal-official-source-01.json)、[独立五pin](./20261006-personal-certified-release-03.json)、[运行五pin](./20261006-personal-runtime-deployment-01.json)、[同快照发现](./20261006-personal-discovery-01.json)。 原父71/98不变，其余未完整验收项保持开放。
