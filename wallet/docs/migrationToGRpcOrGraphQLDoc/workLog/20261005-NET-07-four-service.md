# NET-07自定义四服务设置与storage迁移收口

任务父合同：自定义网络设置与 storage 版本迁移，旧单 URL 不猜测新端点。按[原设计及实际修正](./20261005-custom-multi-service-design.md)，本批完成原剩余“多服务原生权限与完整保存切换”。[实际Chrome检查](./20261005-NET-07-four-service-01.json)通过，0模拟／Execute。沿用[旧空地址修复与36合同／实际Chrome重启保留](./20261004-legacy-network-repair.md)，不将旧单URL制造成新端点。

当前C13构建UI文件SHA4d5b159f、后台58709978；fresh隔离profile，实际worker源码在开始和完整browser重启后均CDP逐字匹配磁盘。实际可见Chrome请求“读取和更改您在127.0.0.1上的数据”，CUA点击本机服务允许；原生contains由false变true。未模拟API、直接写grant或改manifest。产品预检Fullnode／GraphQL／Archive均同H0；账户历史明确显示仍需读取覆盖验证，不冒称覆盖通过。

四URL版本1实际确认保存并切换customRPC，wallet_network_v2和wallet_custom_profile_v2逐字一致；同id版本1重确认真实拒绝且storage不变，版本2重新预检确认成功。完整关闭再启动同profile后，两个storage保留相同四URL及版本2，四origin原生contains=true；重启账户默认锁定、错误密码不解锁、正常解锁均通过。

原设计的optional撤权假设已用两轮真实失败纠正：当前content_scripts.matches含required <all_urls>；Chrome原生remove精确返回“You cannot remove required permissions”，getAll实际含该required来源，原生权限及版本2storage保持，返回修改而不保存准备的版本3。这是required撤权API拒绝的证据，不是撤权后的产品拒绝保存证明。官方[permissions说明](https://developer.chrome.com/docs/extensions/reference/api/permissions?hl=en)同时说明origins包含content scripts hosts、required不能由remove撤销。实际Chrome站点权限撤销、normal CA、完整授权竞争／取消仍在ENV-07／TX-10，未由本项抬升。

01旧pregrant前提失败、02/03headless原生request待决、04/05实际required remove拒绝的全部独立profile与日志保留，06成功输出仍在私有runtime。原输出继承的通用scope未称native prompt通过，本有限汇总另记录实际CUA可见提示及点击；不篡改原输出。生产源码／dist／SDK保持，无需重复完整2382测试；只改非产品harness，node --check通过。当前父NET-07勾选，总体51/98（52.0%），trial_ready=false。
