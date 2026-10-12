# C91 完整prepared及元数据版本持久断点接续（实施前合同）

06:35原child17722由原loop两小时预算正常回收，当前原父7463处于working缓存恢复，child为空且作用域lock0。只读完整账本已达到67394行486335–553728；正式486334／pending553728，pending producer及advisory版本均已记录。原C83仅接受15116行且两个版本为空，C89只接受自然完整published≥553728，均不适用于这个已持久化断点；保留全部旧操作／失败，不重试旧控制器、不改SQL或marker。

- [x] P91-1：封存全部真实prepared rows、chain／fence／admission／三pending版本及SHA，另建精确C91 plan及六源码；只对旧C83namespace、完整tail和三版本匹配增加允许差异。原C50候选／7200秒正常cache drain、working年龄7200、10秒terminal及60秒冻结边界保持。
- [x] P91-2：原81政策／race／真实源cache-stop资格保持，新增完整producer／advisory版本非空、缺失／交换／变更／SQL摘要／锁／child等拒绝；全部源码逆向和当前真实窗口独立审核。
- [x] P91-3：资格全部通过后精确退役唯一C89自有observer，完整原父／无child／账本及原29／14保持；旧watch早退事实保留，不称5400秒自然完成。然后才能启动一个C91有界单次observer；不并行控制器、不自动重试。
- [x] P91-4：全部fresh完整真实ledger／parent／lock0／版本及TLS门通过后精确冻结父，正常SIGTERM／SIGCONT，允许原缓存恢复自然排空（最长原7200秒）；不向child或组发信号、不force-stop。只有原父消失、status stopped／PID移除、完整账本／TLS／lineage保持后才能启动原合格C50，真实独立终验。
- [ ] P91-5：新publisher正式提交及七覆盖、完整13／5／3／6原帧＋C88 summary，Chrome／14父完整业务验收继续；安装或cache drain不计父完成。

controller直接数据库／对象写入0，接续后publisher按原合同合法发布；不能把全部环境称只读。原source／八debug／25actors／29容器／14健康／1015保护文件和1120产品SHA保持，0新Docker、不重播原六NFT交易，不重启原dev。C89完整批次观察在资格准备阶段仍唯一运行，不立即退役。

当前[独立running drain](./20261008-C91-running-drain-independent-01.json)确认唯一62832／10800秒、正式486334／pending553728、完整67394与三版本、父7463存活恢复／无child；before／after冻结及fresh TLS／replica已实际验证。P91-4／5仍待真实old-stop／after-drain／new-launch／authority与正式索引／Chrome，最终实际信号次数待终态，禁止把观察或排空开始算安装。

[实际安装独立终验](./20261008-C91-installed-handoff-independent-01.json)现确认67724原C50／原venv真实live，7463正常stopped／PID移除及完整ledger／三版本／TLS／replica保持；三确切原父信号、0child／group，62832正常158秒终态。上述06:42排空为历史观察，P91-4当前已完成限定安装合同；[安装后七覆盖02](./20261008-C91-nft-post-write-readiness-02.json)仍不足524022，P91-5／14父保持开放。
