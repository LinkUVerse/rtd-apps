# 当前SDK与原生观察协调有限验证

先按[编码前设计](./20261005-network-capability-observation-native-design.md)新增两个隔离验证来源，使用实际生产观察协调器、读会话、SDK、负面准入门槛、原生strict IndexedDB和WebLocks；没有修改生产源码、SDK、旧native harness或发布配置。仅配置合成Fullnode协议夹具，其余入口保持unconfigured。所有断言后的正常浏览器重启使用同一origin／profile，不作为物理断电证明。

[本轮实际日志](./20261005-network-capability-observation-native-01.log)10项全部通过，48次合成协议请求，浏览器错误和外部网络尝试均0；链请求、模拟、签名、Execute均0。正常原ticket完整完成后pending为空；default生产库的明确错链能被另一context拒绝；pending期间业务回调为0。取消及迟到响应不空complete，clone原ticket不能获得新实例所有权。在真实put成功之后中止原生事务，正常和已知负面完成均只尝试一次，原pending保留；前者不发布正面，后者局部quarantined不会变成可用。错误checkpoint与仍占用真实叶lease的兄弟请求竞争也先保存负面。正常关闭整个浏览器并重启后，四种负面／pending状态继续拒绝业务回调。

原生10项、harness类型、两个新来源格式和Node语法实际退出码均0，见[最终检查](./20261005-network-capability-observation-native-checks-final-01.json)。没有初次失败。120既有来源直接SHA逐项不变，加两个新验证来源形成[122项当前完整映射](./20261005-network-capability-observation-native-source-inventory-01.json)。1072项产品SHA仍为26d5c20fcbb93eb8270ad5ca8f48d553958124a2c7d39b046781a1d21534e853；165文件2317项全量属于上一编码批次，因本轮生产字节不变未重复执行，不把10项浏览器场景计入单测总数。

本轮补齐当前SDK＋native协调的上述有限证据。四入口／正常CA／物理故障、F1d后台同审核ABI／独立真实发布pin、最终授权竞争、全部批准UI、原摘要只读恢复例外、当前扩展核心Chrome仍待。无新扩展、部署、dev／journal／回放操作，PID66145保持保护；父49/98、trial_ready=false。见[更新前状态](./20261005-current-state-before-network-capability-observation-native.md)。
