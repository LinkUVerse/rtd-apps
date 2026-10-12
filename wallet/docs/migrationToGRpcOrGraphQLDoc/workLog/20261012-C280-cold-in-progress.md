# C280 当前 G4 完整保留数据冷恢复

本轮对象是当前 dev-20261011-04 的 13 个 native 进程及 13 个容器。只正常停止并原路径恢复，不删除数据目录或卷，不修改原账户或交易 journal。旧链 0..709569 全量回放仍独立开放。

## 停机前证据

- 生产读取基线：`20261012-C280-business-before-02.json`，2 个账户、5 个对象、9 条历史、3 笔原交易成功；首轮 account coverage 上游 503 失败保留，第二轮包含一条自动恢复的 503。
- 普通 Chrome `journal-v2` 10 条（9 笔成功、1 笔旧 G3 dispatch-pending），3 store 校验值已记录 `20261012-C280-journal-before-01.json`。不把 NOT_FOUND 当作撤销或重新广播许可。
- 工具编译和临时容器自然退出清理通过 `20261012-C280-cold-tools-03.json`。
- 停机前检查发现 Docker inspect 的 Mounts 列表顺序不稳定，原始哈希产生假差异；已改按挂载目标排序。13 个 G4 容器的原始挂载哈希均验证为当前列表的排列。两个挂载数量较多的范围外容器在任何停机信号前重新采集双轮基线，未操作它们。
- Native 正常 SIGINT 停机，6,499 个 checkpoint 文件已逐个 SHA256 绑定；其他进程等待发布器自然 idle 边界。

## 已完成的完整持久数据冷恢复核对（QA-A20.4）

- `20261012-C280-all-off-01.json`：13 个原生进程与 13 个 G4 容器同时停止；未停止范围外容器。
- `20261012-C280-docker-recovered-01.json`：原 13 个容器按依赖恢复，容器 ID、镜像及挂载保持，不重建卷。
- `20261012-C280-durable-before-02.json` 与 `20261012-C280-durable-after-01.json`：全部 46 张 PostgreSQL 非系统表、3,172,432 行；14 张 HBase 表最新业务 cell 和时间戳、5,021,247 个 cell；8 个 Rocks CF、335 个键；stage/published/replica 的完整版本清单 11,305/6,794/6,794 项；原 6,499 个 checkpoint 文件全部一致。比较期间原生写入者均停止。
- 此证据覆盖当前 G4 完整持久数据；S3 比较的是版本/ETag 清单，业务 BCS 另行比较。正常冷恢复不等同于强制 WAL 崩溃，也不替代旧 0..709569 完整回放。
- 旧 Rocks 导出器因不允许 G4 路径拒绝执行，未修改数据；新增 G4 范围导出器通过正负 merge、写入拒绝及前后文件不变测试后重新采集。前两轮工具失败及 stderr 保留。

## 本轮继续推进

13 个原生进程已恢复（`20261012-C280-native-recovered-02.json`）。首轮发布器在 Fullnode 尚未监听时启动失败，第二轮在原生节点恢复后成功；没有删除库或重复启动已恢复的进程。真实四入口、两个账户业务和普通 Chrome 最终联验仍在执行。

归档 publication-guard 原镜像作为 PID 1 未处理 SIGTERM，导致正常 Docker stop 等待；已对本轮精确容器发送 SIGINT 正常退出，未使用 SIGKILL。已修复 `modules/publication-guard/server.py`，真实子进程 SIGTERM/SIGINT 和既有服务测试共 5 项通过；本次先恢复原镜像完成前后比较，再部署修复并补充容器实际停止验收。

## 同时发现

普通 Chrome 从 d50b 切换至 3270 后，账户文字与余额正确，但顶部 explorer 链接仍指向 d50b；随后通过 DevTools 页面 DOM 只读检查，实际 href 已为 3270，新的 AX 也已更新；需要进一步复现切换瞬间，暂不能认定产品存在持久错误，不贸然改代码。

## 恢复后的真实接口（QA-A20.3／QA-A20.5）

`20261012-C280-business-after-01.json` 保存完整恢复后 72 个实际请求，Fullnode/GraphQL/archive/account 四入口全部 HTTP 200 且生产 reader 成功解码。最终比较仅因测试脚本单侧 JSON 规范化，将未定义 Display 与省略属性比较而失败；已修复为两侧相同规范化，并在 `20261012-C280-business-comparison-01.json` 离线重核原始结果通过，没有重发请求或交易。

两个账户的余额、5 个对象及版本/所有权/Display、Kiosk、9 条历史、已赎回空仓位、现名称和 3 笔原交易 BCS/effects 均与停机前一致。`20261012-C280-query-window-after-01.json` 验证原记录进程身份、恢复后 consistent 范围 6458..6526 与 GraphQL Ledger 6526，已超过停机时 6498，实际持续摄取恢复。

当前完整 dev 的停机、原容器启动、当前 debug 原生服务恢复及实际四入口请求条件成立。浏览器最终回归与零重复执行独立继续。
