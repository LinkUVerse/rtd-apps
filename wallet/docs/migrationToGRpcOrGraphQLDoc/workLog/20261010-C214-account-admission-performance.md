# C214：账户活动入口复用现有精确前缀准入

## 判断依据

C213活动内部计时中，coverage+page约7.53秒，四次发布准入合计约6.23秒。先检查权限SQL逐表往返：真实只读角色19次语句合并为3次时全部权限事实一致，但热态收益仅约13–19ms，首个批量查询29.85ms还慢于23.27ms基线。因此没有为微小收益修改生产权限检查或其失败路径，保留只读诊断结果。

`20261010-C214-account-exact-prefix-timing-01.json`仅在CLI内存中把reader准入指向已存在的42030，内部coverage/page约1.819/2.640秒；生产reader文件未改。这是诊断候选，不是已部署内部reader优化。

## 已实际部署的精确范围

仅将当前账户HTTPS入口nginx的外层准入上游 `host.docker.internal:41892` 改为既有、已审核的 `host.docker.internal:42030`。业务API41951及其内部两次准入、reader凭据/根/签名key、TLS/SAN、来源规则、账户入口41959/41952均保持。没有新容器、业务API/链/索引重启、数据库写入或签名执行。

实施使用合约仓库 localDeploy/optimize_wallet_C214_account_ingress.py。完整操作目录：`~/.local/state/rtd-wallet-migration/dev-20261006-03/publication-foundation/C214-account-exact-prefix-ingress-20261010-01`，保留original-nginx.conf、candidate-nginx.conf、prepared.json、applied.json。写入保持Docker文件挂载inode，nginx -t后graceful reload；任一验收失败自动恢复原配置并reload。

准备及实施均重新检查精确前缀源码资格、完整fresh visibility相等，包括水位1006768、主副本marker版本及边界blob摘要；3个边界正例、21个损坏权限反例通过（反例是隔离夹具，不冒称生产破坏实验）。36进程、116容器和24健康基础服务现行资格保持。配置diff只有上述端口，没有复用旧的准入成功结果。

## 真实入口结果

`20261010-C214-account-ingress-applied-01.json`：C51账户入口coverage三次5246.452/4965.178/4888.889ms、200且真实H0/覆盖正文通过；切换前两次6430.024/8571.239ms。错误来源返回403，错误链返回GraphQL错误。容器实体/镜像/启动时间不变。时延仅为本次现场样本，不作固定降幅保证。

普通Chrome仍是C210，不需要为服务器入口优化安装新扩展；已保存切换前activity-before-01.har，切换后原生抓包已完成。此处不把接口成功提前算作新版C213或非空账户验收。

## 其他目标

C213具体升级确认仍待回复，构建和源码不因本轮服务配置变化而修改；C211未安装。QA-A19已于C212收口，总体仍93/98。最新发布观测C214：published1006768、pending1482841、prepared64177、锁1，原父93647及子8386真实存活，子CPU时间继续增长。未因旧状态文件年龄而停止工作进程。其余5父项仍按C213阻塞文档逐项收口。

## 普通 Chrome 实际验收

`20261010-C214-activity-har-audit-01.json`独立解析原生HAR：切换前完整周期6请求、22442.418ms；切换后第一个完整周期6请求、18011.973ms，本次样本减少19.74%。前后各自H0、账户、固定覆盖窗口、checkpoint/digest及最终复验全部通过。页面实际显示对应覆盖窗口和空活动结果，未用空结果证明账户全集。

切换后HAR总11条：首周期6条完整，另有下一个轮询周期5条（均HTTP200但缺最终snapshot revalidate）。后者单列为未完成周期，不能当作第二轮完整通过；其中最后一次coverage耗时10.46秒，也说明不能承诺固定时延。

已关闭DevTools返回首页，现场正常显示0 RTD。C213依旧未安装；本轮验收仅为现有C210使用C214账户入口，不代替C213扩展验收。
