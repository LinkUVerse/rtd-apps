# C216：固定窗口查询合并、资产短暂导航复用

## 已实现

- 调用者已提供历史窗口时，`WalletSnapshotAdmissionAndPin` 在一次 GraphQL 中取得 genesis、head、固定 checkpoint pin、全部依赖覆盖及适用的 Display 合同；动态最新窗口仍先获得覆盖交集再选 S。H0、窗口上下界、minimum checkpoint、head、pin height/digest、Display 与读后复验均保留。
- 资产列表/详情仅在同一 binding、readSession、准入代次、snapshot、操作及参数下保留 5 秒非持久缓存。staleTime 原本即为 Infinity（固定快照）且未改变；账户/网络/会话/快照/准入变化重新读取，已知负面立即掩码。无观察者的缓存不维持资产轮询。
- 合并此前未安装 C211 的重型 GraphQL 批处理及余额/元数据/质押/活动短时缓存、C213 的 Fullnode 相同未发出业务查询合并。不限制页面总查询次数；逐页及后续分页仍依实际数据执行。

## 验证与失败记录

- `20261010-C216-full-regression-02.log`：195 文件、2819 测试通过。首轮 3 项失败为旧测试把全部缓存视为当前观察查询；现明确只断言当前观察者，并验证旧准入缓存无活跃观察者，真实新数据和负面断言保留。首轮日志未删除。
- RPC/prod 类型检查 `typecheck-*-01.log` 均退出 0。固定窗口定向 216 项、资产/准入定向 53 项通过。
- 最终 `build-02`、`closure-02`、`source-and-checks-01` 全部通过，源码摘要 `902b3972d06396963e271afc3a9a53d60960707b381a7494c2543bd22705e080`，1131 文件。01 构建早于测试调整，未作为当前可安装产物。
- 与实际安装 C210 比较：8 个生产模块修改、新增 fullnode-read-queue、0 删除；后台三模块和新队列审核通过，manifest/profile/registry 未变。
- `live-pages-01.json`：真实服务活动页完整读取 5 次、7.918 秒，顺序 coverage → admission+pin → account history → coverage → revalidate。资产/Kiosk 空列表 8 次、6.632 秒。只读 CLI，不替代浏览器或非空资产验证。
- `live-reuse-02.json`：首页三轮各 4 GraphQL，3.268/2.885/3.055 秒；质押 11 次/8.923 秒；同余额并发 3 gRPC/20ms。0 签名、0 执行。
- `live-reuse-01.json` 质押失败保留：网关在 2026-10-10 15:32:20 UTC 记录连接 `42031` 上游超时，HTML 错误页使旧观测脚本未记录该失败请求。新版观测脚本先记录状态再解析 JSON，避免低报请求数；02 完整复测通过。一次恢复不等于故障根除，不扩大重试或放宽准入。

## 安装与浏览器边界

2026-10-11 已根据用户具体批准安装 C216-02，原账户、扩展 ID、完整 C210 备份及权限保留；用户随后进一步持续授权后续钱包 Chrome 升级自行操作。没有读取/修改 Chrome profile 数据库。已使用现有测试凭据自动解锁，凭据未写入日志。

实际 UI/后台静态字节核验通过：`20261011-C216-ordinary-bytecode-02.json`。首次审核脚本仍写死旧候选分块43，导致断言失败；实际编译入口分块893，修正验收脚本后通过。01失败保留；生产构建未更改。

原生 DevTools HAR：首页单轮4 GraphQL+1 GetServiceInfo，余额/元数据批处理的H0、覆盖、固定快照871088及digest、owner、空集合与读后复验通过，最终复验10.268秒。活动页完整5 GraphQL、18.407秒，同一请求取得head+admission+pin，固定窗口0–871119及digest与末尾复验通过；页面正确标明空窗口而非历史全集。对应 `20261011-C216-ordinary-balance-har-audit-01.json`、`20261011-C216-activity-har-audit-01.json`。

请求数量改善已在浏览器证实，但本轮活动耗时高于此前C215的13.394秒样本，不能宣称稳定加速。其余页面、短暂导航复用及非空场景仍待，因此P216-4及原五个父项不勾选。

## 后台与剩余父项

`publication-progress-01.json`：published 1006768、pending 1482841、prepared 67638（较 C215 增加 3461），原父 93647、子 8386、发布锁 1 仍在；未发信号、未重启服务。不能把 loop 状态年龄超过 14400 秒直接认作子进程超时终止。

`retained-all41-watermarks-01.json`：41 持久管线最低 215673，215674/709570 = 30.395%，剩余 493896；完整范围重放尚未验收。总体仍 93/98、细分剩余 5.10%，QA-A15/A17/A20/REL-02/REL-05 保持未完成。名称新鲜度、两账户完整比较、物理归档/WAL、非空功能仍需实际证据。
