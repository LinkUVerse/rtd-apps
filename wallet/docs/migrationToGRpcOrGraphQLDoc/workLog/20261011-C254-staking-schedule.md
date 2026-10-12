# C254：旧快照轮次展示修复及普通 Chrome 验收

当前索引S=1006768仍属于epoch2，实际C253质押在epoch5成功。旧表单据epoch2推导第3/4轮，已经过期。现在仅在源轮次尚未结束时显示预计时间；已结束、未来起点、safe mode或非法时间均显示“轮次信息待更新”。倒计时使用已有一秒刷新并在源轮次结束时失效，不增加网络请求，不改变签名或执行准入。收据仍使用已经核验的交易事件，正确保留第6/7轮。

六个生产展示模块变更，后台、权限、network profile和registry保持。41项定向检查、201文件2889项完整回归、两项类型检查、生产构建及5295模块/2039源码/7chunk闭包审核通过。按主人持续授权原路径安装C254，保留C250完整构建和两个账户。实际UI和worker静态字节均与产物相符。

普通C51已实际验证旧表单提示、原C253成功收据、998.86当前余额及两个原账户。抓包71请求：60 GraphQL、8 GetServiceInfo、1 GetBalance、1 ListBalances、1原digest GetTransaction；全部HTTP200。11原生帧完整解码，一轮11 GraphQL由生产质押reader完整重读；其余49 GraphQL只做结构/H0/S检查，不能称全部业务解码通过。没有签名或ExecuteTransaction。HAR是多页及后台重新读取的合计，不能当作单页加载成本。

审核第一次未处理GraphQL批量alias，第二次捕获的收据处于重新读取中间态，两份失败日志均保留；追加实际就绪UI02后[审核03](./20261011-C254-browser-audit-03.json)通过，没有修改原HAR或弱化断言。

[源码与检查](./20261011-C254-source-and-checks-01.json)、[构建回归](./20261011-C254-checks-build-01.json)、[已加载字节](./20261011-C254-ordinary-bytecode-01.json)、[原生UI02](./20261011-C254-native-ui-02.json)、[HAR](./20261011-C254-staking-display-01.har)。

P254三项完成。索引尚未覆盖C253新仓位checkpoint1988842，赎回仍待；本段不勾选QA/REL剩余父项，也不重发原交易。
