# 当前 C43 原质押回执的索引追上读取

承接 [C42 原计划](./20261007-C42-staking-indexed-receipt-design.md)，使用当前 C43 草稿修复后的源码与产物，不将改源前 C42 证据当作当前产物验收。原332734交易及执行 profile 保持；仅沿用 C43 M4 新建的自有空 journal profile 做只读冷启动。父 TX-08 及 84/98 计数保持。

- [x] R1：最新恢复环境、原仓位及 C43 M4 独立审核有效；真实冷启动验证当前UI与worker、原受控owner、空三store和账户密文，正常解锁。
- [x] R2：原GYF摘要回执真实交易成功；真实 QueryObserver indexing=true，十依赖／Display／H0与S>=332734完整一致，回执触发真实资产刷新，无缓存或 journal 注入。
- [x] R3：原生规范 effects 与原审计一致，实际S/digest独立核验；零模拟／签名／执行，密文与journal保持、正常重锁及Chrome关闭。
- [x] R4：独立审核当前源码／产物、页面／worker、原回执、实际索引Observer与原HTTP响应。原503/504、缺失body如实记录，持续可用性和全入口验收保持开放。

前置 C43 live 表单生产记录01与独立审核02均实际通过；原独立01因共享输入新增等价枚举的逐字段比较失败，记录保留。新审核只按官方明确兼容关系验证旧 `mutable` 与对应 `mutability`，不忽略冲突、未知或非排他写，不重跑业务或签名。

此合同不证明原提交后的自动导航、真实赎回或全部 TX-08 入口。新专用 profile 的只读续验获原迁移任务授权，不打开任何原执行 profile 或原 pending。

实际 [Chrome01](./20261007-C43-staking-indexed-receipt-chrome-01.json) 9项检查与 [独立01](./20261007-C43-staking-indexed-receipt-independent-01.json) 均通过：真实S347463／摘要29BVfsaGt6xwUXBuNjXHBmQ2b7e12iFWS1wkoakwxFZx，两份原完整十依赖HTTP响应与真实Observer一致；原生原332734 effects、完整typed checkpoint／contents及H0前后核验成立。原账户密文及三空store、正常重锁、owned Chrome退出保持；零模拟／签名／执行。正常解锁阶段原一份GraphQL503完整body与SHA保留，不认持续可用。原C42计划只被此新版本承接，其未执行证据不勾为C42已通过。
