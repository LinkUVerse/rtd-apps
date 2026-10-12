# 应用列表明确空态改造 A1–A5

源码审计：AppsPlayGround在过滤列表为空时调用RtdAppEmpty，ConnectedAppsCard在permissions.initialized完成且connectedApps为空时仍渲染两个骨架卡。两者已不是Loading状态，却没有空态文本，不能满足QA-A22应用入口明确状态；实际C39 UI继续采集独立记录。法币未对接提示和购买禁止保持。

- [x] A1：实际当前C39两列表观察与原截图／文字／源码相符，确认缺陷；保留采集器失败原因，不混同产品。
- [x] A2：目录空态与已连接空态分别使用明确本地化标题／说明，实际已加载无数据不再显示骨架；过滤列表描述不误称网络已验证外部应用。仅呈现层，不改变发现／权限／服务／交易。
- [x] A3：真实渲染不同上下文，中英文、可访问状态、非空目录和已连接加载条件保持；必要定向／完整类型与全量验证。
- [x] A4：独立当前C40生产编译／闭包／完整source map，使用当前完整六pin，旧C39产物和所有pending保持；实际测量Origin后只调整拥有的loopback白名单，原TLS与拒绝合同保持。
- [x] A5：真实新UI／worker的语言／主题／锁定设置／隐藏重启／两应用空态及法币未对接通过，独立原snapshot／密文／journal／网络审核；所有完整父项要求满足前仍不勾QA-A22或REL-02。

不注入DOM／storage／服务响应，不安装CA、不更换genesis、不广播交易。原源文件在本批私有设计目录留存，原失败工具和证据不改写。正常Chrome HTTPS仍由对应父项处理。


A1实际[保留C39诊断01](./20261007-retained-C39-apps-empty-diagnostic-01.json)两页均有骨架／status0，正常UI解锁／重锁和完整原journal保持；原生产artifact逐字保持，与正在改造的C40工作树明确区分。

A2已编码：目录与连接分别kind传入，明确role=status／aria-live、本地化标题／说明、连接为空仅一个说明且占两列；原Loading与非空批准/拒绝过滤保持。五原文件在指定runtime/apps-empty-state-C40-20261007-01/before留存，语言文件／调用点仅最小增量。初次测试extension feature引导缺runtime.getManifest和Node26本机localStorage遮蔽HappyDOM失败原记录保留；组件单测隔离feature启动并提供单测专用内存Storage，不修改生产fallback或真实Chrome storage。

当前[定向05](./20261007-C40-target-results-05.json)三文件10项通过，包括五项新实际React渲染／locale变化／加载不可当空态／非空批准与拒绝筛选，另两套类型0诊断。production build1119／SHA77df9a7637df9dbe4f08ef22caaf52744bd87c3f8626b9910dea47bb7dc12c39已通过，当前完整闭包／实际Origin／新界面和全量继续；A3完整范围、A4/A5未预勾。


A3完整已由[编码核验](./20261007-C40-coding-verification-01.json)10定向／2637全量／最终两类型exit0、独立完整生产闭包核验。A4[实际Origin注册02](./20261007-positive-C40-origin-registration-02.json)、[60门禁9H0三TLS](./20261007-positive-C40-edge-audit-01.json)、[最新中间件](./20261007-C40-foundation-audit-01.json)通过；仅替换拥有的无数据入口，原账户TLS与27容器未重启；[确认弃用C39入口清理](./20261007-retired-C39-loopback-cleanup-01.json)已精确完成，累计21容器，无卷／镜像／数据删除。注册01在任何操作前因两旧runtime SHA变化失败，现以本次严格恢复holder核验当前runtime，其余历史immutable SHA均保持。

[当前C40真实32项界面](./20261007-C40-ui-preferences-apps-chrome-01.json)及[独立native／原始响应审核02](./20261007-C40-ui-preferences-independent-audit-02.json)通过语言／四theme／auto-lock设置／完整Chrome重启／隐藏还原／两语言明确空态／法币不可用／全journal和重锁，0签名模拟Execute。原图片已转入另一受控账户，缺图NFT已在framework kiosk，索引两卡片都为旧snapshot呈现，不能据此新批准。独立审核01误期待缺图NFT仍AddressOwner而失败保留；02按实际wrapper owner核对，无服务修改。32项未采集创建时密文基线，后续冷账户补证起点单列，A5仍待该独立补证。


A5密文补证已由[当前连接／密文10项03](./20261007-C40-connections-cipher-chrome-03.json)独立完成，基线明确从原32检查之后开始；连接修改与冷Chrome重启均保持encrypted SHA、三store、原偏好和locked账户。目录空态中英文及已批准非空卡片／UI撤销已分别实际验证，支持的网站是否已验证明确未知，不冒充官方可信。完整父清单另经统一审核，自然锁定计时补证正在执行。
