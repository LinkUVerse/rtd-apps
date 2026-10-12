# QA-A21 发布清理与成本完成

[完整独立审核02](./20261006-QA-A21-completion-audit-02.json)通过。当前C28源码1113文件SHA4ccafc8f…914a5a06，完整183文件2573项与类型及production闭包保持，不改变产品源码。

当前完整编译图5280模块、2034份sourceContents、五入口（background/UI/egress-gate/content-script/dapp-interface）、七JS及所有map审核：旧方法/别名/请求器/transport/Kit/fixture不在可达闭包。唯一jsonrpc例外为精确网络无关结构validator。当前审计的三个核心检查函数与已测试审计器逐字相同，8项反例实际通过，AST/新增chunk/折叠模块/validator网络调用均拒绝。

当前Chrome四入口同H0、UI/worker精确字节。设置/锁定/重新读取/原票重启/reload/预算观测累计465个HTTP请求均在四个明确loopback角色中，0公网/旧RPC/页面错误/误模拟/Execute。此为当前指定流量的实际记录；完整钱包业务功能抓包仍按REL-02，不冒称正面名称/NFT/隐藏已验。

[原生扩展列表与预算02](./20261006-QA-A21-current-cost-02.json)五项通过：全新隔离任务profile的Chrome扩展原生列表仅一个RTD Wallet、ENABLED、精确当前ID；未查看或修改用户主浏览器。实际公开GraphQL同完整H0，预算为queryDepth20/queryNodes300/outputNodes1000000/payload5000。

限流/日志/配置按[完整操作手册](./20261006-local-operations-guide.md)与当前全量中的read-budget5/read-concurrency8/response-budget18/account-history-reader24/external-services7等合同核验：四物理名额/等待64/64MiB消息/128MiB调用、取消等待真实body清理、未知状态保留、固定错误投影、私有0700目录/0600记录/不公开原进程环境和密钥。公开预算与源限额均不冒作实测容量或SLA。指南明确仅一个活动钱包及原包/资料保留。

首轮cost01误将合法Fullnode/archive启动身份查询禁止，whole失败保留；修正四角色白名单后02通过。首轮父审核01沿用四入口计数，漏了当前已存在的egress-gate；原断言失败保留，02以真实完整五入口核验，未删chunk或改构建。

A21限定发布清理/观察流量/单活动实例/成本配置文档合同完成，父进度79/98，余19，trial_ready=false。REL-02全部业务抓包、ENV-07/QA-A19正常CA/权限、NFT/名称/隐藏资产、Docker冷恢复与最终REL-05继续开放；不以本项证明完整试用。
