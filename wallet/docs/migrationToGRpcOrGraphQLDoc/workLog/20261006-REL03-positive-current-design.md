# REL-03 当前 C29 配置与包回退 R1–R5

父项要求错链／不兼容journal暂停、密钥与pending保留，以及包／profile回退说明和验证。既有51项包回退证明仅历史限定范围。首轮C28实际permissionBefore=false，预检失败，没有保存配置或future journal；“已有manifest授权”的假设已被实际结果否定。按[打包权限合同](./20261006-profile-manifest-permissions-design.md)修复内置权限生成后，隔离C29重新验证。未知custom origin继续用户授权；普通HTTPS仍由ENV-07／QA-A19验收，不安装CA。

- [x] R1：固定新链六pin当前生产包、四localhost入口、来源与全部文件；独立随机未充值账户，仅本次受控profile。
- [x] R2：真实UI custom revision1保存、同revision修改拒绝、revision2改名、revision3恢复；实际错误H0预检拒绝，保存配置／加密字段／journal不变。回退不降低revision，不直接写网络存储。
- [x] R3：独立公共future-journal夹具显式播种pending，后台恢复明确暂停；实际原始快照保留。夹具不称真实广播pending，已有原摘要恢复合同另留证。
- [x] R4：当前不同生产配置的包在同一owned安装路径A／B／A进行保留profile加载，确认当前UI／worker实际字节、加密字段／全部journal／保存配置完全保持；不操作原profile或build输出。
- [x] R5：独立审核四入口身份原始帧、H0拒绝层、全部阶段逻辑快照与产物来源，逐父合同裁决。只有全部规定验收成立才勾选REL-03，不能把权限失败当错链失败。

原链与新链索引追平继续；本项仅账户／配置／只读身份与暂停验证，0模拟／签名／Execute。

全部阶段依据[当前完成裁决](./20261006-REL03-current-C29-completion.md)关闭。R4使用显式公共profile／未来pending夹具验证包数据保留；真实UI保存与revision回退由独立R2当前配置05证明，两者范围不混淆。原HTTPS／权限升级仍另验。
