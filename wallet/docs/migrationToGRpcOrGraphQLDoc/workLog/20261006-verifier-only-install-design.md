# V4 仅认证校验器安装合同

当前78/98。原批次0–907824的校验进程已退出，原publisher仍working，复制／发布终态尚未确认。不得在working、任何owned子进程存活、原批次未完成或归属不明时发停机信号。

- [x] I1 只读准备：核验当前RTD源码／全部变更、最新8debug、候选build／benchmark／30项矩阵原字节；旧helper源码和旧产物；source／consumer／publisher精确manifest及身份。保存独立私有安装计划、原配置和原可执行文件，不改运行材料。
- [ ] I2 只有原批次终态through至少907824、publisher最近正常idle间隔且没有任何owned子进程时，复核精确进程身份、状态原字节与15秒间隔，再向唯一owned父PID发一次SIGTERM；45秒内确认退出。状态竞态或退出不确定则保留记录停止，不发强杀、不重复信号。
- [ ] I3 父进程退出且没有任何旧校验器使用者后，仅原子替换target/debug/rtd-archive-checkpoint-verifier。verify_checkpoint_range／renderer及8debug、writer、SQL、KV、consistent、TLS／CA／epoch／pending不改。私有备份、耐久intent和逐步status保存，不自动回滚或恢复半成品。
- [ ] I4 source spec只替换verifier provenance引用，重新精确绑定native-live-source/config与publisher/binding、两份manifest。现有writer provenance与其他键保持，实际原生artifacts／source inspect／live inspect全部通过后才启动原命令。旧epoch及pending继续，不手改认证高度或免除验证。
- [ ] I5 原owned命令启动并核验新PID／身份、主校验器来源、8debug／所有消费者PID保持、同链查询。有限启动不代称认证发布、GraphQL追平或最终吞吐；后续新真实批次终态单独记录。

性能候选仍为当前源码dev/debug构建，断言、溢出检查和全部quorum／BCS／连续性校验保持；普通caller提供的seed SHA不成为认证委员会。此安装不要求新的信任权限，原CA和扩展权限问题仍独立开放。

准备02通过，0信号／0运行修改；首次相对证据路径失败在创建操作目录前停止，已保留。五项边界测试覆盖working／复制等待／失败／未完成高度／过期或未来时间／任何子进程拒绝。I2–I5尚未通过。只读SQL01确认active、published726884、pending907824、epoch1，仍非原批次终态。原超时循环、校验和审计成本需要继续解决，不以优化构建或进程退出记为已发布。

[600秒等待01](./20261006-verifier-only-wait-01.md)没有满足安装边界，失败留存；0信号、0配置／可执行替换，候选未安装。
