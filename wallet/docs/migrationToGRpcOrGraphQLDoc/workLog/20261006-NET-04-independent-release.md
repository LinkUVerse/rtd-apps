# NET-04 NC3C：当前配置包的独立认证发布审核

父任务仍62/98，NET-04未勾选；完成当前四个配置包的独立发布pin，服务软件签认、普通Chrome HTTPS及可选未配置部署不包含在本次通过范围。

在指定link-u-smart-contract/localDeploy新增只读认证包导出与审核脚本。以指定rtd最新HEAD 49a05a0de323b45a49d067a855c419e98d071afc、diff e6702a206c6d0a4780ccb2f8d9c869317c65d006e96c3acf2da213f5df5571b3编译debug，约2分14秒实际exit0，前后源码与已部署八个debug二进制相同。模板、认证核心、两份lock和二进制SHA见[构建来源](./20261006-NET-04-offline-export-provenance-01.json)，未替换或重启服务。

完整验证原受控genesis至24450的24,451个离线缓存检查点：委员会quorum certificate、连续摘要、交易／effects／事件摘要及输出Object引用全部通过。只从认证effects实物输出取得0x1／0x2／0x3 genesis包和固定发布摘要Ed7UZxNEBcDNiZxb8giGHLo2AgD3w3myS2MrVqGHCnAq的OriginByte包，版本均1；未由HTTP探测响应生成可信指纹。证据：[认证导出](./20261006-NET-04-offline-certified-packages-01.json)。完整逐检查点日志留在原私有runtime并记录SHA，不复制大量运行日志到产品。

固定干净OriginByte上游commit e8e8efd77ab15d7b2cf30958fd748dbb3afbdaab，22份原源码与转换记录及当前源码SHA一致；逐字验证只进行了sui→rtd命名空间与SUI→RTD原生币替换。三个已发布模块frozen_pub／kiosk／ob_kiosk仅还原self-address为零、保持字节码版本后，与原编译产物完全相同。对标[Sui固定发布适配器](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/sui-execution/latest/sui-adapter/src/adapter.rs#L108)及当前RTD同规则；原provenance里的compiled=false／published=false作为历史准备记录保留，不改写。完整Object BCS与所有模块SHA均进入独立canonical声明，精确绑定当前rev2四入口／H0／generation／可选包。

[当前新鲜探测](./20261006-NET-04-reviewed-live-deployment-01.json)14个只读请求，四包均pin-matched，当前配置ABI兼容；声明SHA323488a85754bac1c6ae57e915aa88cb0c662ee62036da9e1a10939fe103ab2f来自上述离线审核。[真实错pin探测](./20261006-NET-04-reviewed-live-wrong-pin-01.json)将一个独立声明指纹改为零，14个请求后一个pin-mismatch，reviewed-deployment-degraded，未误判匹配。[三负例](./20261006-NET-04-offline-export-negative-01.json)错H0、缺cp0、损坏压缩数据均失败且无导出；损坏压缩数据仅证明解析拒绝，不能称作伪造quorum签名测试。

审核脚本首次将上游路径误当root/package，ENOENT失败；原日志和源字节保留。按原准备脚本定位contracts/package，补充干净git及逐字转换核验后prepare02实际exit0。官方旧programmable_transactions路径404和目录检索失败也记录，不作为权威引用。可信声明、registry与审核结果的原受控副本及公开只读副本有精确SHA：[复合审核](./20261006-NET-04-independent-release-audit-01.json)。

本批零模拟／签名／Execute，原七journal、C19产品源码与开发dist不变。后续生产候选03实际构建／registry AST／全部闭包及最终包普通Chrome装载已经通过，见[TRY-06收口](./20261006-TRY-06-completion.md)；两次失败候选及编译graph／所有成员SHA保留，见[失败来源](./20261006-NET-04-reviewed-production-failures-01.json)。这不包含Chrome HTTPS或签名执行验收。names／PersonalKiosk／原生Kiosk当前未配置，服务Deployment与executionSemantics保持not-verified。
