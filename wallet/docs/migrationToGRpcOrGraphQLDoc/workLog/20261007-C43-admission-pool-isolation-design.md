# C43 单监听器连接池因素对照

前序计数实验384 ABBA＋16原入口control完成并独立通过：HTTP/1.0 baseline188成功／4个实际鉴权TCP connect timeout，HTTP/1.1候选192成功，188对72条TCP／候选120次复用。因原实验同时切换协议和池，本实验进一步隔离池因素，不以单次无失败宣布根因已解决。

- [x] U1：在前序相同保护与debug、同镜像／CA／fresh guard／8检查／32准入／backlog32条件下，唯一新的HTTP/1.1监听器。两个测试lane均调用它，baseline明确Connection close且无pool，candidate keepalive8／Connection空；每个请求附无权威作用的观测lane header，只记录该标签、不参与鉴权。
- [x] U2：32并发、两次ABBA、每轮32，共256完整十域请求；另16原41892control。逐帧body／H0／窗口、真实TCP id／lane／授权完成及所有失败留存。8checks／32admitted／5s等待／12scheck及2sconnect均不变。
- [x] U3：及时清理唯一实验容器和唯一监听器，精确核验原29进程／28容器／14健康、全局所有配置／启动身份／卷／镜像保持，保存日志和原始trace。
- [x] U4：独立关联272原帧／两lane实际连接与授权次数／源码只有对称观测包装，验负例与清理，更新Task及totalProgress；QA-A20父项、持续可用、正式安装仍开放。

同一guard进程同时包含两lane，但压测轮次串行；未完成或超时均保留。不能把此结果声称为正常Chrome资金端到端验收，也不放松名称current-native或S+20。

实际完成：[272原帧producer](./20261007-C43-admission-single-pool-01.json)与[独立原帧／trace／资源审核](./20261007-C43-admission-single-pool-independent-01.json)通过。两ABBA每条lane128×200，原入口16×200；baseline128条连接／128 fresh检查，candidate104条连接／128 fresh检查，实际复用24次、单连接最高2次。全部同H0十域完整窗口，零鉴权connect／read timeout；唯一container和单监听器已清理，原29／28／14及全局109全部资源配置身份、卷／镜像保持。

累计确认清理41容器，0force／卷／镜像删除。池8只保留最多8条idle连接，32并发批次的实测复用有限；本轮耗时接近，不能归因性能改善，亦不能依据零失败证明前序间歇TCP超时修复。下一步上线候选必须先明确admission进程及ingress的受控后继、容量／故障拒绝及回滚证据；不得直接改旧guard文件或破坏已有精确启动／source authority。未安装，QA-A20父任务保持开放。
