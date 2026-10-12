# 当前开发部署、预算与保留数据恢复手册

对应 REL-04；2026-10-06。本手册描述当前原开发链的可维护操作合同，完整故障切换、实际 Chrome 正常 CA、业务共同快照及最终发布分别按 QA-A20、ENV-07/QA-A19、NET-04/TRY、REL-05 验收。不能从进程运行或本手册推导可试用。

## 绑定与端点

运行目录为 `/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261003-01`；其 `publication-foundation` 保存 Docker/伴随服务配置、身份、证书、拥有进程记录和每次独立操作。目录原数据保持。钱包审核 profile 为 `wallet-profile-20261004-03/profile.json`，schemaVersion=2、revision=2、generation=`dev-20261003-01`，完整 H0 为 `3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj`。

| 角色 | 钱包公开入口 | 职责 |
| --- | --- | --- |
| Fullnode | `http://127.0.0.1:39400` | 新鲜状态、构建、模拟、受控单次执行和近期查询；HTTP 仅当前显式本机例外 |
| GraphQL | `https://127.0.0.1:39600/graphql` | SQL/consistent 固定共同快照资产与索引查询 |
| Archive | `https://127.0.0.1:39603/archive` | Ledger/Move 只读方法；13 条白名单及 trailers/流/取消 |
| Account history | `https://127.0.0.1:39606/account/graphql` | 独立账户历史范围/证书，不以 sender 活动替代收支全集 |

三个 HTTPS 使用本机开发 CA，PEM SHA256=`b8d2735d1cf7489f82001d4bc33fdedeccd54dd940680cd7be7da5adcc15d556`。原 SAN/CA/mTLS 保持；Node 有限读取使用仅该子进程的 `NODE_EXTRA_CA_CERTS` 指向公开 ca.crt。普通 Chrome 信任尚未通过，独立 profile 导入仍待工具要求的确认；精确 SPKI fixture、Node 成功不能充当正常 Chrome 通过。

## 最新源码、debug 与 schema

必须使用 RTD 当前源码编译的 debug。当前安装来源 HEAD=`49a05a0de323b45a49d067a855c419e98d071afc`，diff SHA256=`e6702a206c6d0a4780ccb2f8d9c869317c65d006e96c3acf2da213f5df5571b3`；当前八个 debug 的逐文件摘要见[运维投影](./20261006-REL-04-operations-manifest-03.json)。源码有未提交改动，HEAD 相同不代表相同源码；同时核对 diff/changedFiles 与所有 binary 摘要。

`publication-foundation/message-budget-debug-install-20261006-01/installed-provenance.json` 是当前安装证明。构建使用合约仓库的 `prepare_wallet_debug_build_target.py`、`build_wallet_query_revision.py` 和 `prepare_wallet_message_budget_artifacts.py`；独立 cache 构建/测试，保留旧八产物，再由受控安装器替换。不要拿旧缓存或旧 proof 启动改变后的源码；不要在运行中的 debug 目录直接覆盖二进制。

核心当前 source proof 为 `debug-resume-message-budget-20261006-01/source-proof.json`。核验来源/二进制/原 YAML 后，核心退出才可用 `resume_wallet_debug_dev.py --source <RTD源码> --runtime <运行目录> --proof <当前核心source-proof> --expected-h0 <完整H0>` 保留数据启动；它会拒绝已有 PID、端口占用或缺少创建时证明的协议覆盖。返回 ready=false 后，使用 `verify_wallet_message_budget_core.mjs <SDK目录> <运行目录> <H0> <全新输出> <此前原回执/余额proof>` 做实际只读 H0/三原回执/余额及15秒推进，只有通过才能由 `finalize_wallet_debug_resume.py --runtime ... --operation <本次操作> --read-proof <本次实际proof>` 设置 ready。

当前 GraphQL SDL 源为 RTD `crates/rtd-indexer-alt-graphql/schema.graphql`，账户 SDL 源为 archive `modules/account-activity/schema.graphql`，SHA 见运维投影。公开 GraphQL 实际配置读取 HTTP200、H0 一致、Query/Mutation 类型名及四预算见[原始观测](./20261006-REL-04-public-service-config-01.json)。源 SDL 摘要仅标识源码，不能冒充服务独立签认/已审核发布权威；NET-04 的该门槛仍开放。钱包不以公开 Mutation 类型存在为交易执行授权。

## 有界预算

| 层 | 当前合同 | 依据 |
| --- | --- | --- |
| Checkpoint 认证 adapter | 全局6名额；SQL4、consistent1、KV writer1，合计6 | 已验证[实际分配](./20261006-catchup-reallocation-verification-01.json)，不是钱包客户端的并发数 |
| 钱包所有页面/worker读 | 4个原生 Web Locks 物理名额；每上下文等待队列64；取消时释放 | `read-concurrency.ts`/`budgeted-unary.ts`，叶请求持有到 body/status/trailers；执行不走自动重试队列 |
| 钱包消息 | 64MiB每消息、64KiB trailers、128MiB每调用 | `grpc-response-budget.ts`；原生 Tonic 接收上限同64MiB |
| Archive Envoy | 128全局下游连接、每 H2连接64并发流、固定镜像、只读挂载、unless-stopped | [ENV-06实际部署](./20261006-ENV-06-completion.md)、33协议fixture与正常原链读取 |
| 公开 GraphQL | maxQueryDepth20、maxQueryNodes300、maxOutputNodes1000000、maxQueryPayloadSize5000 | 本次公开 serviceConfig 实际返回，不能从这些数虚构吞吐/SLA |
| 重试/期限 | authored snapshot读只对408/429/502/503/504最多3次；尊重Retry-After、退避/取消；throw不重试；期限1–60000ms校验 | `snapshot-read-retry.ts`/`read-deadline.ts`；execute、签名、faucet不自动重发 |

每条读取路径还有自己的 deadline/页数/大小合同；不要将上表最大值当所有业务路径的默认值。429/UNAVAILABLE/超时明确报告，缺覆盖不返回“空/零即成功”。已有原 pending、Fault、journal 不能因限流、时间经过或服务恢复清除。

## Docker 与伴随服务恢复顺序

1. 先只读检查原 Docker compose 项目、卷、固定 image、端口和健康；重用健康实例。使用运行目录中已保存的 compose，`up -d --pull never`；不执行 down -v/prune、创建新 genesis 或改数据库水位。入口 `unless-stopped` 不代表主机进程已恢复。
2. 核心按上一节当前 debug/保留数据流程恢复并实际只读验收，保持 ready=false 直到成功。
3. `resume_wallet_service_set.py` 先 inspect，再对**确实退出**的拥有组件 apply。它逐项检查当前八份 debug、原命令/有效配置、PID、端口、独立锁和全新操作目录；原记录/日志归档。允许组件为 source、adapter、KV writer/ledger、consistent/GraphQL、query listener、account token/capability/API，共十项；禁止把健康进程选入退出恢复。完整 CLI 必需 `--source --archive --runtime --spec --provenance --tests --operation --expected-h0 --component --action`，对应现有私有基础 spec 与当前真实 test/provenance。SQL 生命周期另见下一节。
4. certified publisher 使用其原监督命令和原私有记录恢复，保持 interval15、timeout7200、audit workers4与 replica/control/hydration 全部门槛；不能重建待发布 epoch、重新 admit、手改 published_hi 或以进程 Up 宣称批次发布。
5. 分别实际读 Fullnode H0/原回执/推进、consistent AvailableRange、KV/SQL全部 durable 管线、GraphQL identity/serviceConfig、archive Ledger/Move及账户声明范围；再计算 SQL/consistent/publication 的共同 S。SQL、Display 从0连续证据及22原流水线逐项不倒退都必要。02:19只读观察的SQL最低437220，native/GraphQL此前586007；该观察尚不构成业务共同S。
6. 最后在确切当前 UI/worker字节及合法站点权限/证书下验证实际页面和原七 journal；命令/端口/进程存在不替代此步。完整故障/冷启动范围仍归 QA-A20。

## 当前 SQL indexer 的专门恢复入口

4/1/1 操作后，SQL当前配置是 `publication-foundation/catchup-reallocation-20261006-01/indexer.toml`。原 `display-history-replay-20261005-01/resume.toml`、plan及原监督阶段均保留为历史；**不能用旧2名额命令恢复当前SQL，也不能重放已经执行的reallocate apply。**

合约仓库新增 `resume_wallet_reallocated_indexer.py`：inspect 不发信号；只有拥有 PID 确认不存在时 resume。它核对当前源码/八debug、已验证分配、原22文件备份、H0/adapter6、database identity/绑定、当前4/1/1配置摘要和连续 unbounded 命令，拒绝 PID 重用、错命令、有界回放、配置变化和重复启动。不改配置/水位、无强杀，旧记录和日志私有归档。启动不确定保持 launch-attempt；禁止自动重试，须先检查实际新 PID/记录。

```sh
TASK_RTD_ROOT='/Users/changzechuan/WenchuanProjects/RTD-Blockchain'
TASK_RTD_RUNTIME='/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261003-01'
TASK_RTD_PY="$TASK_RTD_ROOT/rtd-archive-service/localDeploy/data/publisher-venv/bin/python"
TASK_RTD_DEPLOY="$TASK_RTD_ROOT/link-u-smart-contract/all-in-one-deploy/localDeploy"
"$TASK_RTD_PY" "$TASK_RTD_DEPLOY/resume_wallet_reallocated_indexer.py" \
  --source "$TASK_RTD_ROOT/rtd" --archive "$TASK_RTD_ROOT/rtd-archive-service" \
  --runtime "$TASK_RTD_RUNTIME" --action inspect
```

实际 inspect01通过：PID82880仍owned-running、0信号；无需重启。只有独立检查确认退出且核心已实际 ready，才将最后参数改为 `--action resume --operation "$TASK_RTD_RUNTIME/publication-foundation/<全新操作名>"`。8门槛测试通过，覆盖PID重用、篡改/软链、健康不退休、ready=false、不确定启动/重复操作和退休竞争；此候选恢复入口尚未在当前健康SQL上做真实退出/重启实验，不用单测冒充QA-A20。

## 日志、凭据和故障判定

原 process/launch-intent、数据库URL、证书私钥、恢复密码、账户材料、签名/BCS和未脱敏进程日志仅存权限受限的运行目录；0600文件、0700操作目录。不把 `ps command`、环境、整份配置、签名、用户批准消息或原日志输出到 workLog、PR、共享包。错误可能包含带凭据URL；公开错误只投影固定类别。

公开记录采用**白名单字段重建**，不是逐个搜索替换密码。`scripts/capture-local-operations-manifest.py` 只读投影角色/PID、拥有比对布尔、source/SDL/profile/binary/record摘要、公开端点、预算与时间；不输出command/环境/原config/原log/user payload。实际11伴随进程拥有比对通过、0信号/模拟/执行。要再次捕获，给 `--output <全新路径>`；发生异常仅记录errorType，并保留原本私有诊断。当前browser/journal审计同样仅报告摘要、计数与effects状态。

故障排查优先依赖顺序与实际只读请求：TLS/SAN/CORS/权限、source/pub门槛、SQL/consistent共同范围、ABI/SDL/coverage，再到 UI。unknown/degraded/mismatch/reset不同；归档NotFound、索引滞后、重启或改URL都不能解除执行journal。保留失败原文/私有产物与该次源码，下一次使用全新路径。包/profile回滚及旧库兼容完整验证由REL-03继续；本手册不建议恢复过期positive状态或删除negative记录。

当前 C16源码1084文件及dist保持，REL-01独立production审计对应C16。dApp E3/E4/E5的62项原生候选仅dummy/隔离库，尚未安装；不能在产品单独放宽frame-ancestors。下一次产品源码改动须重建、类型/全量及实际 UI/worker、原journal、production闭包重验后再发布。
