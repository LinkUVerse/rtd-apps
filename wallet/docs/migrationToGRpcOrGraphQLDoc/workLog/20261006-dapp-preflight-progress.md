# C25 dApp预检策略整改进展

依据[修复前合同](./20261006-dapp-preflight-policy-design.md)，原C24两个产品文件按完整路径和SHA保存到dapp-preflight-before。C24 gas05实际两次新批准／2签名／4正式模拟／0Execute、旧签名拒绝变化后的bytes、原journal及锁定保持成立，但3次公网dapp-preflight尝试使whole失败。不能标整轮通过；01–04窗口／连接工具失败保持0签名／0广播。

产品hook现在使用已有build-owned外部服务开关，自动与手动refetch都在请求前拒绝关闭的服务，不展示旧缓存安全判定，不为关闭的预检另做交易准备，关闭态停止loading并沿用安全检查不可用提示。开启服务仍使用最终批准bytes，保留网络／读会话隔离和完整模拟／签名职责。修改仅useDappPreflight.ts及其测试；原SDK／RTD和其它产品源码未改。

新 **C25源码7b97be4b6a6f3209a4fecf1edae965c8d0d50efd9221dd149b1ef37378422076／1110文件**；25定向、181文件2556全量、生产类型实际通过。独立production05构建0error／2既有warning，5277modules／2033sources／7JS完整闭包通过，旧C24候选04与C21 dist／ZIP保持历史。

普通Chrome在新候选实际worker／UI字节一致，首次3角色403如实留存；由指定LD脚本更换仅拥有回环listener为loopback-query-dev-20261006-09，保留原6origin并添加实际C25 **ianigokklmjmfnncjkiedbmabjambjgd**。新[四角色身份01](./20261006-dapp-preflight-chrome-identity-01.json)全部HTTP200／同H0，0pageError；正常CA不代表原HTTPS被信任，未导入CA。

新C25 gas06在全新拥有profile实际导入既有受控owner，使用原资金，仅签名两个不同gas预算的批准，不请求Execute；whole与独立审核仍在推进。没有重复C24已广播交易或faucet。当前76/98、剩余22、trial_ready=false；QA-A08／TX-01继续保持开放直到完整合同证据成立。

原C24 TRY-02源审计01误写报告计数75虽合同输入为76，已保留；新source-inventory02报告76并核验当时C24输入。C25产品变化后该文件仍是历史，当前来源需按新版本重新核验，不能继续称C24当前源码。
