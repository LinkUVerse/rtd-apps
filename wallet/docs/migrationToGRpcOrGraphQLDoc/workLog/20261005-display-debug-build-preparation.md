# 2026-10-05：D5／D6部署前检查与独立debug构建准备

上一轮D4为已验证进展；本轮继续真实认证回放及最新源码部署准备，不缩小完整钱包迁移目标。48/98，trial_ready=false。

只读核对七个来源／查询／KV／adapter的原记录身份均与当前PID匹配，核心PID21240仍存活。主机原生来源守卫因D2–D4源码已更新而拒绝旧构建（Native debug build does not match current RTD source）；原公开publication mTLS authorize实际204、空body，账本publishedHi=386503。原查询库22条管线大多284380，sum_displays284382；三个新历史表均不存在。这些是当次观察值，不是追平或新服务已部署证明。见[进程检查](./20261005-display-deployment-preflight-01.json)、[独立PG／授权复核](./20261005-display-deployment-preflight-02.json)。没有绕过主机来源守卫或重写原provenance。

指定合约仓库新增prepare_wallet_debug_build_target.py：先保存原八个常规debug executable，再用macOS APFS clone复制Cargo target到独立runtime目录。2项目录／外部目的地／符号链接／缺失与不可执行文件守卫通过；实际clone成功，sourceUnchanged、originalBinariesUnchanged、retainedBinariesMatch均true。没有给任何进程发信号，原运行路径保持。见[准备证明](./20261005-display-debug-target-prepare.json)、[测试](./20261005-display-debug-target-tests.log)。

build_wallet_query_revision.py和build_wallet_archive_verifier.py新增显式--target-dir支持：在规范、已经准备好的隔离cache编译，证明记录targetDir、deployedArtifactsReplaced=false及当前源码／artifact SHA。默认旧调用保持，未将isolated proof伪装成默认target已部署。辅助verifier补齐全changedFiles及sourceUnchanged核对。

八个debug目标构建已成功，索引器完整库66项测试通过，二者sourceUnchanged=true；与D4 Reader38／GraphQL249的完整源码identity相同。见[构建证明](./20261005-display-eight-debug-build-01.json)、[索引器证明](./20261005-display-indexer-current-test-01.json)。三个publication辅助程序也在同一独立target构建通过，sourceUnchanged=true，证明保存在runtime私有目录current-display-verifier-20261005-01。实际逐文件比较：仅rtd CLI／indexer／GraphQL变化，其余五个服务文件及三个helper均与原默认target字节相同；见[比较](./20261005-display-debug-artifact-comparison.json)。构建成功不等于默认target文件替换、schema安装、认证回放、恢复管线或Chrome通过。后续受控脚本必须核对隔离产物／旧artifact备份、原数据及源码证明，按操作日志替换并更新绑定；旧object_versions单文件reload脚本不适用于本次广泛修订。

新增install_wallet_display_revision.py，独立于旧reader单文件reload：约束D2–D4文件增量、完整三库测试、全部八个新／旧／保留artifact、仅CLI／indexer／GraphQL变化、helper全相同及所有进程身份；prepare／apply分阶段，保留原文件、绑定和启动日志，拒绝不确定重试。新脚本12项和既有生命周期守卫一并通过；实际apply仍待，不能据此记录部署通过。初次native读取误用了SDK根路径而未执行；修正为rtd-ts-sdk/packages/typescript后原链推进及三笔回执／余额只读检查通过（0模拟／0广播）。

后续受控安装与schema已执行，核心原链ready复核通过，认证history-only回放已从0启动；本文件的“apply待执行”是准备阶段事实。最新实际状态以[部署与回放日志](./20261005-display-debug-deployment-and-replay.md)为准。
