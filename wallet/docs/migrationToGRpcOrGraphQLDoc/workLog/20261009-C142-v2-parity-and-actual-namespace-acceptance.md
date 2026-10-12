# C142复查对齐与真实namespace限定验收

## C142完整读取复查对齐与实际namespace限定验收

对照原有限读取源后发现：未上线初稿将复查移到授权后，但少了原授权前第二次SQL和额外源端HEAD。初稿及原限定18测试/缺证拒绝/31反例完整保留，不冒充正向读取资格。新v2只新增source.recheck与双端latest两调用，整源逆变换成立；原授权前检查全部保持，同时保留授权后独立SQL/双端latest/SHA/2秒时效。每个成功point为3次SQL、7次HEAD（source4/replica3），原4名额不变。

实际抽取v2 point/latest/Handler和原recheck/assert_latest AST，以真实本地HTTP/文件SHA/禁止跟随symlink/线程执行8测试，37完整帧（3正向、29空503、5空404）及20独立反例通过。所有成功帧按原序执行全部前置及额外postchecks，故障两端结算后拒绝，第二个HTTP需新组。SQL/S3/权限为明确隔离桩，本项不称实际数据/完整source通过。

进一步实际执行同一v2 gate AST，对原C139指定的真实guard正确mTLS读取204完整H0/水位头及200原marker；独立SSLContext错误CA、错误peer SAN、无client cert均实际拒绝，未改系统CA或原配置。错误期望H0及超出实际的期望高度，仅是私有校验参数与真实未变的原始头对照，不称原guard换链或返假头。4个真实线程共同等待，一次实际mTLS调用处于各自调用区间内；后来的新调用确实第二次授权，0完成观察缓存。6个实际HTTP响应/3次TLS拒绝、全部原始头/正文/时序及27独立反例通过，原/C120/C139七出生身份保持；只接受namespace传输和协调，checkpoint真实SQL/S3/body/postchecks与完整source仍待。

真实HTTP对照控制器已准备：必须等全部709570输入/quorum/指定独立审核完整成立，才创建目录、启动v2或请求。使用现有42891基线和自有42892候选，在同1额外请求和现有3消费者背景下作ABBA；另测候选3/4并发正确性、完整membership边界与每请求/真实授权时序，所有正常/拒绝/截断帧都保留。比率至少1.20且完整权限/故障/数据资格成立才可考虑切换，不能把不同并发/容量拒绝或样本当持续重放收益。候选目录仍不存在，未运行全source对照或安装，原C139回放保持。

仅P142-2b/c/d上述限定工作完成，P141全709570认证及独立复核、P142-2完整真实读取/权限/差分/收益和3正常切换仍开放。完整41管线数据比较/两账户/物理S3版本/归档/冷WAL、普通Chrome/TLS权限、名称及全部非NFT M5继续；一期全部非NFT验收后再验证NFT。原89/98、细分剩余9.18%、trial_ready=false保持。

证据为钱包workLog/20261009-C142-v2-point-parity-local-01.json、20261009-C142-v2-point-parity-independent-01.json、20261009-C142-actual-namespace-transport-01.json、20261009-C142-actual-namespace-transport-independent-01.json、20261009-C142-v2-real-http-controller-preparation-01.json；合同为同目录20261009-C142-full-source-preauthorization-parity-design.md、20261009-C142-actual-namespace-transport-design.md与20261009-C142-real-http-qualification-design.md。

[8隔离HTTP/37帧](./20261009-C142-v2-point-parity-local-01.json)、[20反例](./20261009-C142-v2-point-parity-independent-01.json)、[实际namespace传输](./20261009-C142-actual-namespace-transport-01.json)、[27实际时序/范围反例](./20261009-C142-actual-namespace-transport-independent-01.json)、[阶段观察03](./20261009-C141-full-input-phase-observation-03.json)。
