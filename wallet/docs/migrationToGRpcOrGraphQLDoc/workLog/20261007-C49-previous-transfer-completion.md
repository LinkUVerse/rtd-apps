# 当前状态（2026-10-07，六真实发送／六以前转移拒绝完成，52退役清理）

总体 **84/98**，14完整父项开放，trial_ready=false。原E5／S5b要求的写后索引与页面刷新尚未覆盖最大执行checkpoint524022，因此RPC-22／23、QA-A07及TX-08未提前勾选；已验证的发送及准入子项实际完成。

[C48真实首发19检查](./20261007-C48-nft-execution-browser-01.json)2205原响应、六不同NFT各一次Execute、六Verify、24 ENABLED模拟、六成功journal／零pending／正常重锁关闭。[独立02](./20261007-C48-nft-execution-browser-independent-02.json)核验最终规范BCS／GasData／expiration／原签名／effects／六native检查点及recipient owner、OB已有／新target Kiosk、source cap与locked／exclusive保持，最大524022；0额外模拟／签名／Execute。原工具失败01保留，不能据此重复六发送；C48签名profile保持关闭。旧八件未变证据仅是发送前历史。

[C49真实9检查](./20261007-C49-previous-transfer-browser-01.json)291原响应、六以前已转出NFT的visible fresh native拒绝，零模拟／approval／签名／Execute、三journal／密文及源／1015保护文件保持、正常重锁关闭。[独立六规范Object／owner／previousTransaction](./20261007-C49-previous-transfer-browser-independent-01.json)与原六成功摘要相等。真实旧索引仍显示原持有关系，native守卫阻止再转移；未注入快照／响应。

[524022覆盖](./20261007-C49-previous-transfer-readiness-01.json)仍七门未齐：正式434325／pending486334，两个资产／账户head434325；[实际生产minimum拒绝](./20261007-C48-nft-post-write-admission-01.json)和[独立原帧](./20261007-C48-nft-post-write-admission-independent-01.json)均通过保守拒绝，链成功与journal仍终态，不代替写后覆盖或页面刷新。

[临时C49正常清理](./20261007-C49-previous-transfer-gateway-cleanup-01.json)、[独立52](./20261007-C49-previous-transfer-gateway-cleanup-independent-01.json)与[最终环境](./20261007-C49-previous-transfer-final-environment-01.json)通过：原29运行／14healthy、八debug／原进程／当前1120来源a03／1015保护文件保持，110全局＝105运行／5退出，累计52确认退役；三临时端口空闲，未知退出／卷／镜像不动。C48／C49各自profile正常关闭，未重开任何旧profile。正式安装仍为原C44旧1db，当前C46是限定实际回归产物。[两链／faucet四实际读取](./20261007-C49-current-native-health-01.json)200、正确各自H0／gRPC trailer0，faucet仅GET健康，0gas分配。

[34秒测量03](./20261007-C44-current-ingestion-performance-03.json)及[独立计数](./20261007-C49-committed-boundary-stall-independent-01.json)显示18持久水位均434325不变，native前进160，三成功摄取计数0、128／129／128为NOT_FOUND尝试。[Sui与RTD源码裁决](./20261007-C49-ingestion-metric-source-contract-01.json)已同步双方方案：latency count不是成功checkpoint数，当前优先正式发布边界，不能将本段等待视为永久吞吐／关闭guard或清pending的理由。G46合并传输仍未实现或安装。

[自然观察05](./20261007-C44-publisher-handoff-watch-05.json)已结束，未触发activation／安装，observerSignals=0。原父publisher按实际working／pending恢复，不发信号强切。C47锁屏解锁及普通CA问题尚未收到回复，普通Chrome完整安装／TLS／权限仍未验收。后续执行检查点达到524022后继续实际生产索引、页面刷新及其余父合同。
