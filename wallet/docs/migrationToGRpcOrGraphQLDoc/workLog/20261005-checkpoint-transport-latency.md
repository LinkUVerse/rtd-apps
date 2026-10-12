# checkpoint TCP延迟实验未证明收益，已恢复原镜像和源码

任务NET-11／ENV／TRY；本批不新增父完成，51/98、trial_ready=false。按[实施前计划](./20261005-checkpoint-transport-latency-design.md)尝试仅给已认证socket设置TCP_NODELAY。完整结果：[有限实测与恢复](./20261005-checkpoint-transport-latency-01.json)。

同checkpoint290000、同1759字节SHA、原CA及mTLS身份，各12次实际读取全部成功；中位0.079832→0.106314秒，本样本约增加33.2%，不能排除负载差异，更不能称提速或断言TCP是瓶颈。内部594成功请求中位0.045619秒只是诊断输入，外部时间差未被当作确定根因。

候选34项guard完整主机测试与3项AST部署守卫通过，新增真实mTLS socket／HTTP状态／精确正文／依赖失败零正文测试。首轮两项失败源于把macOS非零TCP布尔标志4断言成固定1；依据[Apple XNU TCP说明](https://github.com/apple-oss-distributions/xnu/blob/main/bsd/man/man4/tcp.4)改按布尔非零检查，原失败和代码保留。构建只在当前已安装的indexed guard基础上COPY server.py，镜像基层和visibility、checkpoints、consumer_proxy、requirements、prefix_ledger、prefix-proof六成员逐字保持；实际候选native同H0、checkpoint0／290000固定SHA读取通过。

指定link-u-smart-contract部署目录升级脚本upgrade_wallet_guard_tcp.py实际应用候选后复测，消费进程和水位未手工修改。第一构建因FROM裸sha被Docker解释为仓库而失败，改为原镜像本地tag；首应用因兼容证据缺result=pass被既有gate拒绝，原镜像在finally恢复，原操作和源码保留。修正后在独立03操作中重建／核验并应用，未改写失败证据。

复测无收益，使用同部署目录rollback_wallet_guard_tcp.py还原原镜像cbc2a7ec...。首次回滚后的即时读取URLError，终态当时没有确认；后续只读核查选中镜像和实际容器均为原镜像，fresh原CA/mTLS gate通过，再用finalize_wallet_guard_tcp_rollback.py落定原操作结果，未重复部署。原native读证明仍publishedHi586007。最后源码按精确原server SHA恢复，候选源码／测试另存，当前恢复源码34项完整测试通过：[恢复后02](./20261005-guard-restored-host-tests-02.log)。恢复后01文件实在来源恢复前提未满足时运行，实际仍是候选34项通过，不能算恢复验证，完整保留。

本批TCP没有收益，原认证、全部前缀、固定版本与双副本验证没有削弱；没有发布结论或对象正文缓存，没有扩并发／丢历史／改水位。真实SQL索引和publisher积压仍在处理，后续应分开诊断完整前缀认证、批次发布与消费吞吐，不能靠进程alive抬升trial。
