# C197 发布者当前观察及保留原因

当前36个actor/116容器和指定rtd源码debug前后核验通过；SQL使用repeatable-read/read-only，只记录必要标量，不打印连接凭据或完整进程命令。

[实读01](./20261010-C197-publication-progress-01.json)：active、publishedHi=1006768、pendingHi=null、preparedRows=0、publisherEpoch=1、fence=active、admission开启，**publication advisory lock仍1把**。原publisher PID93647仍working，子publisher PID23622仍存在。状态更新时间距观察约6902秒，原配置预算14400秒。

另外仅筛选实际子进程命令的脚本名/非敏感--through字段，确认为原C105 checkpoint-publisher-dev.py，目标1482841。此处是当前调用目标，不能称已发布；不能仅凭进程存活或CPU时间断言全部阶段健康/会按时完成，也不能仅凭pending为空授予交接资格。该脚本SHA为22a7c2e06e5637b56668b6f3b23059ab2b9f8ad69b3266bee8f96724de02d49e。

因此本轮不杀工作publisher、不解除fence/lock、不写pending/水位、不换来源。名称正面验收仍需已提交数据与索引达到读取起始的真实Fullnode高度；完整重建固定0–709569仍由独立C159消费者推进。C196已恢复真实持久进度取证，接下来可直接复用新工具，不能再把过期1.78%或旧失败当当前状态。

本项仅诊断，不计QA-A15/A17/A20完成；无签名、Execute、数据库写或服务信号。
