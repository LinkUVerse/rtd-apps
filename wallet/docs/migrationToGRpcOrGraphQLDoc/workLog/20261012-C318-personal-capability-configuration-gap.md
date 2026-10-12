# C318：重建入口继承了早期 Personal Kiosk 空配置

固定范围 `0..709569` 的生产 `AccountGraphQL` 实现查询，第一名非空账户即返回 `HISTORY_UNAVAILABLE / HISTORY_NOT_VERIFIED`，未取得完整历史。该轮直接调用真实 API 实现和数据库／GraphQL，但使用 `native-account-index/reader.json` 早期保留配置，未通过正式 HTTP 门面；不计完整账户验收通过。

**实际服务绑定复核后的更正**：正式 G3 钱包账户入口使用 `account-positive-install-20261006-01/reader.json`、数据库 `rtd_account_positive_20261006_01`，已配置下述 Personal 类型。当前 master 29848、worker 98277 在 41951 服务，经 41952 TLS 门面读取。C318 的“original”文件标签指早期保留库，不能理解成正式服务失败。C298/C301/C302 重建错误继承了早期空类型，是本轮需要修复的缺口。C325 改为正式 TLS 门面及正确 profile 绑定读取完整三账户；正式 reader 和 worker 不需要因此换配置。

失败交易为 `cSRkmqRs95uTmVP2Vt2sLo5zAqvW3sQUuS7GvbcXeT2`，checkpoint `424677`。失败边界是 Personal Kiosk `0x7ddf2a6770e47652e882045d15b780f025b56e8faa4bc87cf9831dfa65897727` 的交易输出状态。早期保留库及重新从正式归档生成的 C302 库都没有该 Kiosk 的能力记录，解析器因此拒绝声称已确认唯一历史持有人。

## 根因及修复方式

早期 reader、能力 worker 以及继承它们配置的 C298/C301/C302，`personalTypes` 都为空。链上输出实际包含 `0xb95a49d8ed90cccc3ea4356e3618fec1b3ea2f00624bec409fecb6a249e41a05::personal_kiosk::PersonalKioskCap`；C43 原生独立证据也记录了同一 Cap、内嵌 Cap、Kiosk、账户和交易。问题不是仅清空索引即可消除的旧脏数据：沿用漏配配置重建也会复现。

[Sui 官方 Personal Kiosk 源码](https://github.com/MystenLabs/apps/blob/main/kiosk/sources/extensions/personal_kiosk.move)将标准能力包在 `PersonalKioskCap` 中；[官方 Kiosk 说明](https://www.docs.sui.io/onchain-finance/kiosk/kiosk-example)说明能力所有权的意义。修复应纳入本链明确部署的完整类型并对原生交易边界重新验签，不能拿 Kiosk 的当前 `owner` 字段猜历史持有人。

C319 使用当前 C274 debug 原生能力索引器、C298 已核验归档字节重新认证完整范围。在早期保留账户库及 C302 重建库添加新的独立能力 root，保留原 root；逐 checkpoint 对照 C301 的摘要、blob SHA、交易数、原有标准能力变化，以及最终原生验证状态。完成后重建 reader 绑定新 root，并与正式 G3 TLS API 对照；正常正式 reader／worker 保持。早期库中新增的辅助 root 未接入业务，后续按实际用途清理。

## 性能问题与受控续跑

C319 首个一万点增量已原生生成，但导入器逐行数据库往返耗时明显。仅对该 helper 的 PID／启动时间／完整命令验证后发出 SIGINT，进程以 130 退出，`KeyboardInterrupt` 和原产物保留。未向链、发布器、消费者或容器发送信号。

C320 已使用 psycopg 流水线调用相同生产 importer，保留原事务、所有校验和原子封存。已有原生产器输出重新核对后复用；已提交批次由 importer 精确字节匹配，未提交批次重试。真实隔离库的 9999 点错误 footer 使 generations／checkpoints／transitions 三表整批回滚，实测 1.623 秒，[原始结果](./20261012-C320-pipeline-rollback-01.json)。之后有效一万点批次在两库分别约 1.5–1.9 秒完成导入，原生认证仍逐点执行。此性能调整不是跳过校验或减小重建范围。

原始资料保留于私有 `publication-foundation/C318-fixed-account-oracle-20261012-01/`、C319 操作目录；错误选用早期配置的失败不删除。此项正在自动修复，无需用户介入；QA-A17.5 保持未完成。新的能力 root、完整历史 API、重建配置部署及其后回归均需实际完成。
