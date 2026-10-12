# 第二次系统重启后的恢复与清理

目标：先核验 Docker 与原数据，恢复两个受控 debug 开发链及当前 C39 查询环境，再推进业务验收。恢复过程不更换创世配置，不删除数据库、归档、账户密文、journal、发布 pending 或镜像。

- [x] R1：核实本次系统启动时间、当前源码与八个 debug 产物，原 PID 已不存在；两链原 H0、原监听归属和 checkpoint 实际推进通过。
- [x] R2：28 个当前容器保持运行；仅移除 20 个停止且已被当前入口替代、只有两项只读配置挂载的 loopback 容器（7 个 C39 正面入口历史实例、13 个两链历史查询入口）。清理前后记录精确容器／镜像身份，数据卷与镜像删除数为零。
- [x] R3：按原命令恢复原链 11 个、新链 14 个查询／账户进程及两个正式发布器。保留启动前 process／launch-intent；独立审核按本次恢复身份复核，不沿用重启前的 PID。
- [x] R4：新链 HBase 14／SQL 23／Rocks 4 的实际持久覆盖、Display 谱系、fresh source／replica 发布授权以及 C39 的 54 门禁／八 H0／三私有 CA TLS 握手通过。原 PNG 字节与四项拒绝路由通过。
- [x] R5：六个账户循环的新提交或真实追平状态分别与 sealed SQL 头核验，三个 API 的实际覆盖及拒绝合同通过；原链冷启动后的查询共同窗口须真实成立。
- [ ] R6：环境全部就绪后，复核当前十项资产依赖的共同窗口。只有覆盖 framework placement checkpoint 180806 才运行该 NFT 的一次真实转移；继续保留其他转移及严格 pending，禁止重复发送。

恢复证据：`20261007-postboot2-original-native-read-01.json`、`20261007-postboot2-g3-native-read-01.json`、`20261007-retired-loopback-cleanup-01.json`、`20261007-postboot2-online-audit-01.json`／`02.json`、`20261007-postboot2-C39-edge-audit-01.json`、`20261007-postboot2-display-media-03.json`。操作记录保存在两个 runtime 的 `postboot-20261007-02-*` 目录；原链 core 的操作为 `debug-resume-8c9fde5e478c42a4a9b9526f405a1c86`。

首次原链恢复工具用错 provenance 格式，启动前即拒绝；随后使用保留的匹配 source-proof 并重新核验八产物。首次原链 companions 使用系统 Python 缺少依赖，启动前拒绝；改用已有 publisher venv，未安装或替换依赖。媒体首次终验因 launch-intent 尚在恢复前归档而失败，随后恢复原字节；第二次发现 macOS 解释器 exec 的身份变化，经同启动时间、原参数及实际解释器独立核验后登记稳定身份，第三次实际终验通过。没有重启媒体或掩盖这些失败。

原链账户循环的 `IncompleteHistory` 已定位到实际 public checkpoint 804762 的 digest 返回 null：Rocks 冷恢复下界 808286 超过当时 GraphQL／Ledger 水位 804681。这是实际共同窗口不足，不能用容器 Up、`availableRange` 的无界数值或 sealed 根证明读取成功。保留自然追平过程，禁止手改 watermark、重建 RocksDB 或把空结果记为正常。新链账户头 101943 已与 source 及 public checkpoint 对齐，但仍须单独审核四个循环的真实追平及 SQL payload。

98 个父任务保持 80 完成／18 开放；本轮恢复与局部证据不替代完整冷启动、正常 Chrome HTTPS、业务回归或可试用验收。


后续实测：基础中间件[独立02](./20261007-postboot2-foundation-audit-02.json)确认28当前容器／14 healthcheck healthy、两套只读 TLS PostgreSQL、两套14条HBase持久数据及两个正式发布器；该证据当时未声称全部业务 ready。[账户全部05](./20261007-postboot2-all-account-audit-05.json)随后确认三个 API／六个循环的真实覆盖、sealed SQL payload 与原生公开 checkpoint，以及错链／未来／伪造头拒绝。原链[查询窗口02](./20261007-postboot2-original-query-window-02.json) consistent808286–820352、Ledger810171，冷恢复缺口已自然消除；初次错误使用G3诊断端口的工具失败保留，不更改服务。

清理：[7项精确清理](./20261007-retired-loopback-cleanup-01.json)与[13项精确清理](./20261007-retired-query-ingress-cleanup-01.json)，均先归档每个精确ID／镜像／只读挂载元数据，仅 docker rm 已停止的确认替代实例；当前28服务及两个历史有效入口保持，不删卷／镜像／文件。未确认退役的旧 PostgreSQL／archive 初始化容器继续保留。

当前C39[重启后15项pending](./20261007-postboot2-C39-pending-chrome-03.json)、[独立原帧](./20261007-postboot2-C39-pending-independent-audit-01.json)及[实际主机启动分界02](./20261007-postboot2-C39-pending-host-audit-02.json)通过：原三store／密文完整、正常UI解锁及重锁、持久UI连接下durable拒绝、仅原digest lookup、0新增模拟／签名／Execute。host01的h0标签错误装入scope序列化字符串，原件保留，02明确拆出H0／generation并复核原profile与全部输入SHA。

R6尚未完成：当前[十依赖03](./20261007-postboot2-framework-prerequisite-03.json)共同101942–110623，未覆盖framework180806；名称还需当前Fullnode高度覆盖。按实际独立子合同继续，不能把已恢复的基础服务运行状态代替所有业务／试用完成。
