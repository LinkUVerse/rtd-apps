# F1c／F2c.2b：当前session NC5观察及原ticket协调有限收口

按[编码前设计](./20261005-network-admission-observation-design.md)、[实施前状态](./20261005-current-state-before-network-admission-observation.md)及[8份原字节](../evidence/20261005-network-admission-observation-before/manifest.json)完成本轮编码与有限验证。父任务保持49/98、trial_ready=false。

Provider effect每session独立持有一次NC5，先异步选择受控release输入再原生begin；StrictMode已关闭的首次effect不占位。普通QueryClient撤值不会取消其观察，离开会话明确取消。当前视图不缓存client／账户／payload、不授权交易，四族及各领域S保持独立；完整链路的账户探测本轮为coverage-only，allAccountHistoryVerified仍false。

配置角色（至多4）、配置GraphQL八域及Move十二组使用同一个原ticket；begin完成后才真实SDK。createCapabilityFetch直到封存保留请求计数及保守子signal取消记录；body／trailer／cancel cleanup未结束或任一叶取消不视为完成。30秒子wrapper结束、末尾身份成功但fetch仍在途的实际SDK用例，原占位保持pending，迟到结果不空complete。仅本轮正常完整投影／分类后才提交原ticket；明确身份负面即使兄弟请求在途也写入，提交失败不二次空complete。

受控WALLET_REVIEWED_DEPLOYMENTS通过common DefinePlugin编译为固定标量，运行时模块只捕获一次。缺失／不同完整binding保持unreviewed，registry拒绝呈deployment incomplete/policy，不重新生成pin。真实独立审核发布签认仍缺失；合成夹具pin不能代称真实部署。common配置只保留精确三行新增，首次无关格式变化的字节作为诊断保留后精确恢复。

Provider使用开始时的只读binding模板，身份负面关闭session后仍能安全撤为quarantined且不残留旧四族字段。checking／pending／storage失败／域门槛拒绝隐藏正面。已发布报告发生撤值后不能因稍后空capture恢复旧报告；普通领域读取仍各自取得新的proof。Display ABI负面不关闭余额会话。所有批准UI、原journal只读恢复例外、后台同审核ABI门槛与最终原子发布竞争仍待。

实际退出码与日志SHA见[最终检查](./20261005-network-admission-observation-checks-final-01.json)：165文件2317全量，新增32；9文件187定向功能，最终全量覆盖最后仅type annotation修改；RPC／钱包／独立compiler脚本三套tsc、12来源格式均0。6项独立真实common webpack／production selector编译验证缺省、精确pin、运行时global/env篡改、不同binding、代码片段注入，仅生成隔离临时selector并成功清理，无新扩展。普通memory store仅控制流；React用真实四族SDK／RTD schema／BCS及真实query撤值，原生IDB提交／当前SDK＋native coordinator／真实链与扩展未在本轮执行。

失败并未抹去：[15份首轮及中间诊断源码](../evidence/20261005-network-admission-observation-diagnostics/manifest.json)，原始类型缺省行／literal、测试area额外reason、ticket any annotation；React在act内等目标状态阻住自身flush，改为每次act结束再断言；subscribe为instance arrow导致首次trace失败。曾尝试completion显式invalidate，诊断确认门槛已清零而React尚未flush后撤回，无实现残留。全部失败日志及有限状态诊断保留，未把skip诊断计通过。

[13本轮来源／120完整当前来源](./20261005-network-admission-observation-source-inventory-01.json)及[1072产品文件精确重建](./20261005-network-admission-observation-unchanged-product-reconstruction-01.json)证明：只在内存替换8份旧SHA并排除4个新增product文件，恢复上轮1068文件SHA `9496af2d7520ad00c302beef7bb9a01aa4c5283d0341ef25596c780a87e2f072`；其余wallet／core／config／SDK产品字节均未变。当前产品SHA `26d5c20fcbb93eb8270ad5ca8f48d553958124a2c7d39b046781a1d21534e853`。未重启RTD、未动PID66145／回放／部署／journal，无模拟／签名／Execute，磁盘仍历史C9。

[webpack官方文档](https://webpack.js.org/plugins/define-plugin/)及[冻结来源](../evidence/official/20261005-network-admission-observation/manifest.json)支持编译期替换、字符串作为代码片段及JSON.stringify引号合同；无新增Sui接口裁决。新扩展／normal CA／核心Chrome及剩余RPC、TX、TRY仍必需，不因本轮单测提升为试用。

双方文档审计[最终02](./20261005-network-admission-observation-document-verification-final-02.json)及[精确执行器03](./20261005-network-admission-observation-document-verifier-03.py.txt)实际0：57文档、81共有二级章节（80逐字一致，1仅旧07→新08链接编号差异）、120当前源码直接SHA、61原字节／29历批诊断副本、17官方／59链与SDK原来源及三仓diff check均通过。首个执行器误把编译警告与末行JSON视作整份JSON；第二次把6个本轮有意替换的历史输入当未变化当前源码，失败结果原样保留。03只为历史来源补精确原字节匹配，当前120个来源保持直接现字节核验，未放宽或移除当前检查。
