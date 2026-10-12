# C198 用户初始化后普通Chrome继续验收

用户已明确完成C51测试钱包初始化。实际原生AX确认ID kiahlcbejlgmnbmcggnhagbccojnbkaa、#/tokens、本地网络、新测试账户0x9d7652713f02b13b73744ba47e4f21ca0a0a2966cc02df86adcde2041454e5bc，查询错误仍可见。未读取密码/助记词，未代接受条款；旧初始化阻塞解除，不等于ENV-07完成。

实际原C51 nginx容器2713d76d...停止、41957/58/59均关闭；三个原TLS上游41981/41903/41952仍监听。先按原ID/配置/来源与原116容器/36actor完整核验，再只恢复此容器，配置、TLS/方法/origin保持；明确记录原容器运行状态的合法变化，旧严格运行scope只能在停止它恢复原态后再使用，不伪造旧scope通过。

当前1122产品源码与C188相同。用C51原profile和原完整证书registry重新独立production编译并审核完整closure，为保留原ID/新测试账户的原路径升级准备。升级前完整保存C46产物，实际更新市场外本地产物须在最后一步取得电脑操作工具要求的确认；旧C46安装许可不扩展为当前新版本的确认。此时不覆盖已安装包、不改用户新profile。

- [x] P198-1：初始化真实观察、原C51容器恢复与三入口真实HTTP、保持原36actor。
- [x] P198-2：当前源码/C51profile独立生产构建、完整closure/权限/证书审核，生成可审阅升级包。
- [ ] P198-3：最终升级确认后保留ID/账户升级，普通Chrome实际三入口/UI/worker/TLS/权限完整矩阵。

不签名/Execute，不导入原钱包，不改系统CA，不以旧C46或CFT结果当当前普通Chrome完成。

## 本轮已实测结果与当前前置

- 初始化已由用户完成且AX实核；原C51容器已按原ID/配置恢复，三入口9个完整HTTP帧：三正确来源POST200、三预检204、三错误来源403。两个启动前失败（Path入参、Docker旧版null/新版空DNS数组表示）均0启动，原件保留；v3只归一化历史三个确切空DNS字段，其他配置完整相同。恢复后仍116容器，46运行，24基础依赖健康，原36actor保持。
- 原生Chrome旧C46钱包实际显示0 RTD；仅空测试账户余额页面恢复，不计当前构建/非空资产/完整三入口UI或worker通过。
- C198当前1122产品source 3d91de575e74c39300a20e749636deed8e65cbe2c4dc0f615a6c50c5911f2017独立编译通过，完整5285模块/2036源码/7脚本closure通过。C51profile和完整release registry保持；manifest仅version/version_name从26.10.7.0变26.10.10.0，权限完全相同。已准备同ID升级文件，未安装；明确最终升级确认已异步发出。
- 普通Chrome实际直连原HTTPS archive端点被NET::ERR_CERT_AUTHORITY_INVALID拒绝，临时页已关闭，未展开/绕过警告，未改系统CA。loopback HTTP及网关内严格TLS成功，不冒充浏览器对私有CA的正向信任。此项仍影响ENV-07/QA-A19正确TLS正例，等待合法信任方案；无需阻挡当前loopback UI验收。
- 第一次协议探针误要求gRPC trailer冒号后必须有空格；实际完整合法帧为grpc-status:0。v2只修正空白解析并严格唯一状态0，其余同链/完整帧/来源合同不变，真实9帧通过；失败原件保留。

原C195/C197严格scope包含C51停止状态，因此现在须使用manage_wallet_C198_ordinary_gateway_v3.py verify的显式新运行事件，不得直接声称旧严格scope还能通过，也不得修改其历史baseline。后续旧范围工具恢复前须先正常停止C51或建立同样明确的新范围版本。

证据：20261010-C198-ordinary-initialization-observation-01.json、ordinary-gateway-restored-03.json、ordinary-gateway-protocol-02.json、ordinary-old-build-balance-observation-01.json、ordinary-tls-rejection-observation-01.json、ordinary-upgrade-prepared-01.json；构建/closure为20261010-default-generation-positive-C198-build-01.json及closure-01.json。本轮均无签名或Execute。

独立协议审核：20261010-C198-ordinary-gateway-independent-01.json，完整9个原HTTP帧/完整gRPC消息及trailer/同H0/来源逐帧通过，6个缺帧/篡改/越界验收反例被拒绝，未重新发请求。新升级仅准备；最终用户确认尚待，不代操作安装。

## 用户批准后的实际原路径升级

用户明确答复“允许原路径升级并继续验收”。通过普通Chrome扩展管理正常停用原ID，完整旧构建更名留存后将审核产物换入原路径，再正常启用并重新加载；实际扩展页与钱包设置均显示26.10.10.0，ID和原测试账户保持。安装器核验完整旧/新artifact与当前产品source，未读写Chrome profile数据库，权限和系统CA不变。

实际已加载UI（ui.js、503.js、957.js）及background.js字节全部与审核构建一致，仅使用只读Debugger脚本读取，未使用Runtime/DOM或UI自动化协议。升级后最初显示余额网络校验提示，随后正常页面显示账户锁定，不能由此判定接口故障或余额通过。已打开正常解锁界面，请用户在本地输入原密码；未获取或输入密码。点击当前本地网络按源码为no-op，没有切换网络或更改授权。

证据：20261010-C198-ordinary-upgrade-user-confirmation-01.json、ordinary-extension-disabled-01.json、ordinary-upgrade-installed-01.json、installed-ordinary-browser-binding-01.json、ordinary-bytecode-01.json、ordinary-upgrade-native-ui-01.json。P198-3尚含当前三入口实际调用、完整权限/TLS矩阵，保持未勾选。先前“等待升级确认/未安装”段落为当时记录，当前已由本节更新。
