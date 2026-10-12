# QA-A13 当前真实空窗口子项

[当前Chrome03](./20261006-QA-A13-current-window-ui-03.json)7项与[独立原响应审核](./20261006-QA-A13-current-window-audit-01.json)通过。当前C28精确UI/worker、真实导入受控账户、actual local选择；账户API原HTTP200无partial、窗口670805–726884、0交易、hasNext=false。六旗标原样保存：registrationComplete/allActivity/allTransfers=false，registeredKiosks/discoveredOwnerTokens/discoveredCapabilities=true。页面实际显示该窗口、历史全集未认证、仅所示窗口受支持活动为空；不能从0交易推导账户从未交易或没有其它类型历史。

0模拟/签名/Execute、0公网/页面错误/CA改变，全部原用户/旧失败profile未打开。本批新账户资料只在新0700隔离fixture，私钥/密码不写公开proof；原响应文件0600，公开proof只记录hash/计数/旗标。

首轮01页面窗口提示可见，但response.body采集失败，未取得raw page而whole失败；无法仅凭通用Error断言其根因。02改为转发前捕获原HTTP字节，却在无关token metadata等待失败，未进入历史阶段；原记录保留。03将活动入口与元数据显示等待分开，保留全局身份/存储准入，未改变产品代码或协议；成功捕获并原字节转发完整账户页。

QA-A13的非空sender/收款/对象变动/Kiosk/token/capability语义仍须按扩展承诺完整审核，不从空scope子项勾父任务。当前79/98、余19。
