# E6候选原生来源与UI边界：42项有限完成

[编码前合同与实测修正](./20261006-dapp-egress-surface-design.md)；[13轮23项](./20261006-dapp-egress-surface-native-13.json)、[15轮38项](./20261006-dapp-egress-surface-native-15.json)、[16轮42项](./20261006-dapp-egress-surface-native-16.json)均实际exit0。Chrome153.0.8010.12，原生runtime MessageSender/getContexts、父HTTP getFrame、两个runtime port与隔离MessagePort一次性挑战，strict IDB消费和最后parent.postMessage实际执行。不是stub API成功。所有payload仅固定public-peer-fixture-dummy，0账户/签名/交易/证书变更。

三类网站普通/严格frame-src none/COOP same-origin都配对并仅单次dummy；cap/session/ticket/gateOwner/challenge不进入公开父事件、DOM或URL。只有gate.html可网页访问；未公开UI在网页祖先下实际Chrome导航拒绝。另真正extension顶层UI加载自身child，子UI入口在任何bootstrap导入前阻止，强制harness连接亦被后台top-frame拒绝；gate URL不能冒用UI channel。上述第二种攻击有扩展权限的fixture才可执行，不能说普通网页拥有此能力。

未知session、假cap、缺/多字段、并发重复claim拒绝；网页伪造init无法替换原私有channel。特权harness偷取尚未使用的fixture cap：跨tab实际拒绝且原source随后正常配对/发布；同tab另一gate最多得到一个待确认challenge，因没有原content创建的MessagePort不能沿原port确认，0配对/0issue/0dummy。后者等待真实30秒期限，原peer/gate关闭，过期仍拒绝。导航和拆除gate使原文档/port失效，held消费回执无重放；content主动断连后的held receipt亦0公开输出。

## 全部首次失败保留

01–02错误UUID格式，03–08误认为webNavigation能读取extension gate的当前文档/父document；05私有MessagePort已正常。09隐藏iframe的默认rAF等待导致超时；10提前读取未定义flag；11–12将最小WAR导致的UI导航拒绝误作入口guard未运行；14误用了Worker不存在的waitForFunction。对应01–12/14失败log、生成的实际fixture、peer/launcher冻结字节均保留。13/15有各自运行输入SHA与冻结来源；16绑定当前来源；未覆写旧失败或把部分checkCount当成功。诊断只输出身份类型/匹配bool/fixture URL及UI flag，不输出cap/ticket/签名。

## 当前dev只读核验

[11拥有进程复核](./20261006-egress-runtime-owners-01.json)实际exit0，当前源码8debug/SQL4/consistent1/writer1保持，0信号/重启。[native range](./20261006-egress-native-window-01.json)min=max=586007且GraphQL ledger同值；本次不是common业务S。

连续SQL观察02严格一致性检查[首次失败](./20261006-egress-sql-observation-02-failure.json)，未写成功JSON。[独立逐字段诊断](./20261006-egress-sql-diagnostic-01.json)随后严格validate_coverage实际通过：22原管线最低473845，Display0–473851/473852 markers、coverage=watermark、端点摘要及H0匹配，readerLo0、writerEpoch11。框架committer源码将handler和watermark放同事务，不能把首次失败擅自解释为正常分离提交；首次失败未输出原字段，原因未证实，需继续观察。禁止清/改水位，不能说错误已修复或积压消除。

## 正式集成仍待

CandidateEgressStore仍仅test命名空间、dummy绑定；产品C16/原CSP/dist保持。E3正式canonical库及profile验证、E4全部真实写入前屏障、E5真实签名出口、E6产品入口/CSP组合、E7全量/当前产物/真实签名均待。候选的30秒peer预算仅覆盖本fixture请求，不作为产品用户审批等待时限：正式每次结果门槛应在审批完成前捕获revision，在批准结果出口时建立短期ticket/gate配对，原请求监听不能提前销毁。旧Fault/pending/执行journal原文保持。父NET-04/TX-01/TX-10仍开放，总体58/98，trial_ready=false。
