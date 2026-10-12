# 新链真实质押仓位前置

当前C42只读前置在六个受控keystore账户均未发现原生StakedRtd。为完成TX-04的真实赎回表单，需一个实际新仓位；不使用旧H0仓位，不注入索引或对象。

- [x] F1：新链当前系统／验证者、余额及空仓位前置，最新RTD debug/source；C42完整差异证明保留C41的质押运行模块和后台字节未变。本阶段使用已注册的保留C41真实UI创建夹具，不冒充C42浏览器验收。
- [x] F2：仅新受控收款人profile，正常UI导入／保护／原空journal；实际验证者选择与1RTD表单。原C39 pending和任何原profile不打开。
- [x] F3：正式ENABLED模拟和最终canonical bytes，sender／gas／shared系统引用／当前验证者／数量与Validity固定；fsync原attempt后，仅一次真实产品批准、一个明确原摘要和最多一次原Execute转发。任何不明结果只恢复该摘要，不重跑工具或再次发送。
- [x] F4：原摘要新鲜原生交易／effects／events、真实新StakedRtd对象BCS／owner／pool／principal、唯一原签名和完整三store独立审核；正常重锁和关闭。未知派发保留profile、原attempt和journal。
- [ ] F5：新仓位实际checkpoint T记录后，当前C42在共同S>=T时读到其staking域／仓位，再进行M4完整表单竞争及正常赎回。未覆盖时保留待同步；本夹具不提前勾TX-04／TX-08或98父任务。

当前系统只有一位验证者，费率仅epoch0一行。Pending仓位可用于当前合约决定可赎回性的真实模拟；不能把零估算奖励或一次本金赎回声称为正收益验收。夹具只调用dev现有系统合约，不新增部署；所有环境仍来自当前本地RTD debug和既有link-u-smart-contract脚本。

F1–F4 证据见[完整推进日志](./20261007-G3-staking-fixture-progress.md)、[真实保留 C41 UI](./20261007-G3-staking-fixture-retained-C41-chrome-01.json)及[独立原生审核02](./20261007-G3-staking-fixture-native-audit-02.json)。实际新摘要 `GYFwbYZEPNWnKzeGJgYgDYar9gZKeMZdHaiTSHSpwZFu`、checkpoint **332734**、仓位 `0x6f9d9ac3516532ac642a3f823f384976914be69e70d5b28fbf012a3d0c3b39e5`，本金1000000000 MIST，activationEpoch1。只发送一次；审核01因误读不存在的 profile.packages.system 字段失败，原失败保留，02只读修正审核，没有重发交易。F5 所需 S>=332734 超出正在执行的 G4 目标283000，必须后续实际覆盖。

## 已成功新夹具的真实冷启动子项（不计98父任务）

- [x] C1：只重开本轮新受控成功fixture；实际保留C41 worker／UI、完整原三store／account ID／正常锁态匹配。首次打开建立approval后的cipher投影，不声称此前已取证。
- [x] C2：正常UI解锁、只读原摘要成功收据与诚实indexed同步提示；零新批准／签名／模拟／Execute。原C39 pending和所有原保护profile禁止打开。
- [x] C3：正常重锁、完整Chrome关闭和第二次cold／正常unlock-relock；完整cipher投影及三store保持，全部请求／帧／取消分类留证。不能冒充当前C42 UI、主机重启、赎回或QA20完整父验收。

实际[cold03](./20261007-G3-staking-fixture-retained-C41-cold-03.json)8检查／76原始帧及[独立审核02](./20261007-G3-staking-fixture-cold-independent-02.json)通过：两真实完整cold、四cipher／完整journal状态、唯一原摘要canonical签名／BCS／effects／332734回执，0新模拟／签名／Execute。cold01过早读取加载占位、02固定空格与实际“1／RTD”分行布局不符，原失败保留；03明确等待精确分行金额。独立审核01把合法空GetServiceInfoRequest protobuf误判为非法，CLI失败记录已明确补存；02仅离线修正解析，未重开Chrome或重发。
