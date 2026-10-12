# C37 钱包账户历史的实际原生依赖

C36三个后端／真实15页与15原生回执已通过。C33浏览器history01实际在进入账户页之前被前端 `GraphQLSnapshot.open(HISTORY_NATIVE_COVERAGE)` 拒绝，UI显示等待索引同步；只有覆盖查询返回200，未请求历史页面。前端额外要求未使用的 `Address.objects` 跨旧窗口覆盖，与C36认证路径的实际合同冲突，失败保留。

- [x] D1：前端账户历史只预检实际读取的checkpoint、affectedAddress／affectedObject交易、历史object、objectChanges五类原生字段；客户端没有Address.objects枚举。服务自身必须核验它实际采用的scanner依赖，旧普通scanner继续Address.objects要求，认证SQL服务采用C36认证合同。固定窗口／chain／digest／分页／BCS回执／coverage旗标／终验不弱化。
- [x] D2：冷snapshot下界大于历史窗口仍可读取已认证页；五类实际依赖任意保留缺口仍在第一页前拒绝。定向、全量、两类型和独立最新production完整闭包验证。
- [x] D3：测量新包真实Origin和已有五端口权限，再只增加严格loopback白名单，保留五旧Origin／Account TLS／所有数据与发布/index服务；实际门禁、身份、TLS分别验证。
- [x] D4：实际最新UI／worker字节、完整非空历史原生事实、具体交易卡片、全journal不变和relock验证；其余NFT预览／转出／身份及ABI关闭owner矩阵继续独立验证，不将本子项冒作98父完成。

Sui官方字段保留映射与C36独立裁决一致；读取历史事实不会自动获得历史Address.objects枚举能力，也不要求未使用字段始终存在。服务范围与客户端真正读取字段交集仍须成立，不能绕过实际有界查询或以空记录隐藏错误。


定向02实际134通过、两套类型exit0；01保留三项失败（两旧源码pin与旧六依赖静态预期）。新独立官方／本地审阅manifest保留旧manifest及官方快照，只有当前C36已独立验证源码重新绑定，并增加官方available_range原字节SHA；不重标旧构建。C33 UI失败与后端15实际回执范围分开。


D2终验：134定向／全量2625／两套类型／独立最新production和完整闭包通过，1118产品文件SHA8526354c8c0a006eadf17a54d3ae7172a590e28c106639bb008c41eb886eaa85。真实Origin afbkeollcabflffdklhphjmomnicjckd，五端口权限contained、未知41999false，加入前真实GraphQL403。D3入口切换与D4当前UI另验。


D3：registration01只替新链旧owned C33 loopback，保留原容器及五Origin，Account TLS零重启、保护进程零信号。edge-audit01实际42门禁／六H0／三TLS SAN与私有CA握手通过，未批准optional权限或导入系统CA。


D4历史页实际12检查通过：最新C37真实UI/worker，0–85627窗口16条、53967/54771/71849具体卡片可见、读取/锁定前后完整journal相同。独立原响应审核01将全部16条逐项比对15原生回执及四角色原生genesis，六次实际五字段历史窗口读取有效；不重新打开原profile、不替代NFT/转移。当前C37三种NFT预览01已实际15检查/6正式模拟通过，批准BCS/digest/gas、返回/relock及完整journal保持，0签名/Execute；单次真实转移按独立X1–X5清单推进。
