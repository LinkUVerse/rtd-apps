# RPC-04 当前币发送页面验收合同

父项70/98，RPC-04、QA-A05、QA-A08保持开放。使用revision3独立回环候选、正常Chrome参数，全新自有profile；原七profile／原HTTPS／CA／链不变。只从既有受控资金fixture读取私钥到内存，真实私钥导入与密码保护页面，不记录秘密。无新注资、签名、Execute。

- [x] C1：当前生产候选实际worker／所有UI JS字节核验，真实导入目标地址、实际local网络，HTTP外部／JSON-RPC／Execute请求拒绝。
- [x] C2：独立共同S metadata／余额与实际币列表显示核对；WMIG decimals=6、余额500000原子单位与coin/address分项保留。
- [x] C3：非原生实际金额0.1及Max（0.5）表单、检查页面、有效期与gas显示；同一次真实模拟的完整交易bytes／balanceChanges验证。
- [x] C4：原生Max实际表单／gas扣除模拟、批准页面，返回不提交；零额、过小精度、余额不足、无效地址的实际按钮状态（不计完整QA-A08错误版本／未知命令／gas再授权）。
- [x] C5：源码输入完整路径快照、独立原模拟BCS审核及旧RPC-04证据与当前相关模块字节继承审核后，按原父合同判断是否可收口。任何失败原文／已建profile保留，新版本另存；不得用新一次成功改写失败。

实际NFT／hidden／dynamic／staking独立推进，不与本合同混算；原HTTPS仍待验，trial_ready=false。

C5补充：[十个原编译module字节审核](./20261006-RPC-04-current-lineage-01.json)与当前两笔实际发送分别验证继承范围和变化的准入／执行路径；原Oct4真实执行只按历史保留，不宣称其全部业务编译字节相同。完整收口见[完成记录](./20261006-RPC-04-completion.md)。
