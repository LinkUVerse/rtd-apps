# GraphQL Display 水位配置补齐

实际 C17 生产 reader 在 `WalletSnapshotAdmission` 被 `MoveValue.display` 的 `FEATURE_UNAVAILABLE` 拒绝，完整报文见 `20261006-c17-snapshot-diagnostic-02.json`。源码 `available_range.rs` 的 reader_lo 要求 `hist_displays` 出现在当前 Watermarks；GraphQL 的 `IndexerConfig.pipelines()` 仅从传入配置提取管线名。现行 GraphQL 命令使用原 22 管线配置，而 Display 的独立回放配置已在真实数据库覆盖到 586007。因此连续覆盖记录存在，但 GraphQL 的管线清单未包含它。

按以下子任务推进：

1. 再次核验最新 debug 来源、原 GraphQL 进程及命令、严格只读 SQL 覆盖、原 22 管线及绑定；保存原配置和命令。
2. 在原目录另建只供 GraphQL 使用的 23 管线配置，完整保留原配置，追加 `hist_displays`。原 indexer／Display 回放／publisher 配置及数据库保持原样。
3. 使用 `link-u-smart-contract/all-in-one-deploy/localDeploy` 中受控部署脚本，仅替换已确认拥有的 GraphQL 进程。prepare/apply 分阶段，apply 前再次核对输入；每次信号／启动前落盘，不自动重入或重试。
4. 以实际 availableRange、Display coverage 和完整钱包 reader 检查修复；失败保留，不能凭进程存活、配置存在或高度一致记为完成。

这里补齐的是已执行的独立认证管线配置，不是新增或手动推进水位。仍需原生 H0、sourceId、generation、marker、完整窗口验证。正常 Chrome CA、账户全集覆盖及独立发布声明继续分别验收。
