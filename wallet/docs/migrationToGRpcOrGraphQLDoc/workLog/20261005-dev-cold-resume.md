# 冷启动后 dev 服务恢复与当前业务边界

任务：ENV／TRY、Display 历史回放、NET-07、RPC-11／13。主人明确要求检查重新启动的 Docker、补齐 dev 服务并继续。实施前范围见[设计](./20261005-dev-cold-resume-design.md)。本批不新增父完成：50/98，trial_ready=false。

## 实际恢复

[只读检查](./20261005-dev-cold-resume-checks-01.json)记录 17 个本任务 Docker 依赖运行、10 个补启动宿主伴随进程存活，以及核心节点／查询／归档／账户共10个端口监听。节点采用当前 RTD HEAD 49a05a0de323b45a49d067a855c419e98d071afc 对应的最新八个 debug 产物；已安装来源证明逐一校验，未用发行版。沿用原 H0、链数据、部署配置和服务命令，未重建创世、清数据库、改水位或重部署合约。

核心恢复使用 link-u-smart-contract/all-in-one-deploy/localDeploy/resume_wallet_debug_dev.py 和 finalize_wallet_debug_resume.py。启动恢复 durable consensus 后，第三轮实际原回执／余额读取和 15 秒采样通过：781115→781199、3 条旧回执保持，0 模拟／Execute，runtime.ready=true。前两轮监听未就绪／水位尚未推进的失败原样保留。

补服务使用同部署目录新增 resume_wallet_service_set.py：当前八份 debug 来源、退出进程身份、原命令与配置、可用端口、独立锁和新操作目录先核验，再恢复 checkpoint source／adapter、KV writer／ledger、consistent／GraphQL、查询准入 listener、账户 token／capability workers／API 十项。certified publisher 使用原 run_wallet_certified_publisher.py 恢复。没有重新 admit 或授予新 lease。前期 CLI 选项及 API owned-path 检查错误只发生在 preflight，原失败／代码备份保留；修正后实际 inspect/apply 成功。

## 历史回放恢复

重启前 PID66145 的原 bounded 子进程真实退出码为2；原 supervisor、终态、命令和原22条流水线水位保持。[退出只读证明](./20261005-dev-cold-resume-replay-01.json)核验 durable Display 前缀0–369437／369438 markers。

新增同部署目录 continue_wallet_display_replay.py，仅接受身份／命令／来源匹配且子进程和监督者确实退出的失败。独立恢复目录保留原 exit2，不改原 runner／计划，以原 bounded 命令从已验证持久前缀继续；当前 child66899，目标386503。实际退出0、完整连续前缀、原22水位保持和最新 debug 来源全成立后，才可按原 resumeCommand 恢复全流水线。当前仍在回放，不冒充 live 就绪。新增恢复门槛测试共8项实际通过，两份日志：[伴随服务](./20261005-dev-cold-resume-service-tests-03.log)、[失败回放续跑](./20261005-dev-cold-resume-display-tests-01.log)。

## 当前查询与真实扩展

[真实 fresh Chrome](./20261005-dev-cold-resume-browser-01.json)使用当前 C13 UI／worker，Fullnode／GraphQL／Archive身份同H0，0外部／模拟／Execute。账户覆盖没有通过，networkIdentityAccepted=false。三个 HTTPS 使用精确 leaf SPKI；不声称 normal CA 信任通过。

[实际业务响应](./20261005-dev-cold-resume-admission-01.json)仍返回 stakingSnapshot FEATURE_UNAVAILABLE、accountCoverage HISTORY_UNAVAILABLE / UPSTREAM_QUERY_REJECTED；数据没有被伪造为空成功。当前SQL全局最低水位288451低于consistent可读下界586007，GraphQL的共同快照不能建立。需先完成有界回放并恢复原22索引 catch-up，再验资产、非空staking及账户历史。fresh staking 两次失败 profile／输出保留，均0模拟／广播；不能计为通过。

[原交易 journal 惰性只读核验](./20261005-dev-cold-resume-original-journals-01.json)实际7条链回执／effects／逻辑SHA保持，两个原profile native状态逐字不变，各pending1／fault0；0模拟／Execute。auditor改用 inert manifest 页面，禁止业务挂载及 IDB upgrade，不删除旧pending。

## NET-07与后续

按[四服务设计](./20261005-custom-multi-service-design.md)扩展实际设置验收。首轮旧harness预设Fullnode权限不成立；改为四服务fresh场景由实际页面提交申请 native 权限，第二轮真实预检仍未启用确认按钮。两轮实际失败及独立profile保留，0模拟／Execute；NET-07未勾选。后续在共同快照恢复后复验预检、版本递增、撤权拒绝与完整browser重启，native API不模拟。

当前服务运行不等于业务可试用。优先继续恢复共同读窗口与当前实际页面，再按98父清单完成未验接口／授权／恢复矩阵。所有私有密码、账户资料、原BCS和日志保留于受限runtime目录，本目录仅有限汇总。

## 有界回放实际终态与live恢复

[完成证明](./20261005-dev-cold-resume-replay-completed-01.json)：continued child真实exit0、完整0–386503／386504 markers、RR/TLS、原22水位保持通过；原失败exit2及其终态SHA保持。重新核验最新八个debug、原bounded／resume命令和身份后，实际resume成功，PID57235。全部23条SQL流水线开始从各自持久水位继续，目前约289k，业务common S仍未通过。NET-07随后实际可见原生授权／四服务保存重启收口，见[独立合同日志](./20261005-NET-07-four-service.md)；此前50/98及失败状态为当时观察，当前51/98、trial_ready=false。
