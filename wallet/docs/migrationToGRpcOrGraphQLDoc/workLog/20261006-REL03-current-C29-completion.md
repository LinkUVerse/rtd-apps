# REL-03 当前C29配置与包回退完成

当前产品1116文件，SHA ab6a6b6a013e3920caf3f46ecdac0b9c20c69699cd8b36d8c16e166e777f153d。按父合同核验：错链与不兼容journal暂停、密钥与pending保留、包和profile回退说明及验证。当前[生产包](./20261006-default-generation-positive-C29-build-01.json)／[完整闭包](./20261006-default-generation-positive-C29-audit-01.json)、[四服务实际Chrome](./20261006-positive-C29-assets-chrome-01.json)10项／127请求／原journal保持成立。

[配置回退05](./20261006-positive-C29-profile-rollback-05.json)25项：真实用户表单revision1预检不保存／确认切换、同revision拒绝、revision2改名、revision3恢复且只增加版本；真实错误H0通过Fullnode身份返回后明确“钱包查询入口属于不同链，已停止接纳数据”，不保存错误配置。未来journal公开夹具版本3含1条pending／记录，后台恢复明确暂停；浏览器正常锁定重启后完整快照不变、错误密码拒绝、原密码解密返回原导入key并重新锁定。没有降低revision或手写已批准的custom配置。

[包回退01](./20261006-positive-C29-package-rollback-01.json)51项：一个owned安装路径实际C29→C28→C29，同extension id，三个阶段UI／worker字节与对应生产产物一致；真实加密账户、全部公开journal rows、网络配置在降级与恢复后完全一致，未来journal继续阻止恢复。仅此包夹具的profile／pending是显式公共播种，真实UI配置批准由独立配置05证明；不称广播pending或物理崩溃。历史产物和每阶段安装拷贝均保留。三个包阶段实际错H0均返回同链身份拒绝；原proof.scope描述中“permission errors”是错误预判，以实际stages字段和审核02裁决为准。包02重新运行在第三阶段chrome://extensions加载超时失败，不能覆盖01已经留存的三阶段完整实际证据。

[独立审核02](./20261006-positive-C29-rollback-audit-02.json)重新核验全部输入／产物SHA，35完整protobuf身份响应及末grpc-status0（含实际错误H0阶段）、配置三版本与全部加密字段快照、包三阶段完整journal rows及pending引用；[入口审核01](./20261006-positive-C29-edge-audit-01.json)18门禁、两实际Origin的GraphQL H0和三TLS握手保持。审核01错误预设包拒绝应为permission，原日志保留；审核02按实际链身份分类通过，不按预判改造钱包。

配置操作顺序：保存前核对完整H0／generation／各入口，先身份预检再确认；恢复旧字段时使用更高revision。包回退必须关闭受控浏览器、保留完整profile／密钥／journal／原产物，在相同安装路径恢复已审核包，再核对实际UI与worker。若journal版本不兼容，保持暂停和原pending，恢复兼容包后按原摘要只读恢复，不清库、不重发未知交易。原HTTPS／新可选权限及正常Chrome商店升级授权另归ENV-07／QA-A19；本项0模拟／签名／Execute／CA修改／原用户profile访问。

REL-03父合同完成，整体80/98、18待验、trial_ready=false。完整业务抓包、NFT／名称／写后读和有限追平继续，不能由本项宣称整套迁移完成。
