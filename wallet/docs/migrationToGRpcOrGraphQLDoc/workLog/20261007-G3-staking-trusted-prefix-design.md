# 新仓位后续区间的私有可信前缀

发布已提交319967，但仓位T332734及候选333000仍未覆盖。此工作只核验当前已提交前缀，减少之后的重复quorum计算，绝不安装source／消费者或授予新HTTP成员资格。原G4 controller42450／session50926保持，不重跑、不改原配置。

- [ ] P1：已知有限操作只读身份、最新RTD source／八debug／optimized-debug verifier、原283000完整quorum artifact／state／rows／native log pins和新鲜source+replica publication319967核对；前缀可见事实只取实际已提交上界。
- [ ] P2：私有APFS独立inode clone；0–319967全部当前published SQL／local body SHA两次核验，原0–283000完整row集合必须与可信前驱一致，初末seam／tail两角色latest version／replication检查；不以三个点的HEAD证明完整区间授权。
- [ ] P3：原283000 state SHA负例无输出；当前源码编译的optimized debug verifier独立验证283001–319967的全部36967个quorum、digest／body行连续性，产生私有319967 state；当前保护环境及原artifact不变。
- [x] P4：独立复核全row／新quorum log／state／生产binary来源和原native检查点typed摘要、源／副本边界，明确privateSeedOnly、fullReplayAuthorization=false／installed=false。新增333000认证、完整HTTP／SQL／对象probe及明确后继恢复authority仍待，不勾98父项。

本操作的trusted state由真实原生quorum校验器生成且固定前驱SHA；不会写入任何运行consumer／publisher的cache、watermark、journal或admission。新克隆额外文件不在已验证row集合，不可服务。若G4开始恢复或身份变化，活动只读guard立即停止接受；不能重启G4来满足本工具。

[准备01](./20261007-G3-staking-trusted-prefix-preparation-01.json)实际通过，301.52秒，319968完整SQL／local body两阶段和原283001前驱rows一致，36967当前optimized-debug quorum／digest／body连续，错误seed无输出，最终已知有限操作身份仍保持。servableCheckpoints=0／privateSeedOnly=true／fullReplayAuthorization=false／installed=false。

P4独立复核工具绑定原计划、22保护query／两core／两publisher及28实际容器14healthy，而不对有限三消费者授予authority、不推断自然退出／恢复；新quorum来源和全部data pins单独核验。P1–P3原准备过程的已知有限身份检查保留原事实，两者范围不同。当前独立session99220执行中，P4不预勾。

[独立01](./20261007-G3-staking-trusted-prefix-independent-01.json)已真实通过：319968新鲜SQL／全部local body与独立inode、36967连续native log行／前驱／state pins、六fresh两角色HEAD及五native完整原始调用／三canonical summary和contents typed digest一致。22保护query／两core／两publisher／28容器14healthy初末保持，不认定有限consumer自然终态／恢复。P4完成，0database write／signal／签名／Execute；fullReplayAuthorization=false／servable=0／indexedStakeAccepted=false／withdrawalAccepted=false。上文独立执行中是前阶段，已由本段终态替代。
