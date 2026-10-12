# QA-A18：当前 C18 Wallet Standard 回归完成

[编码前范围](./20261006-QA-A18-current-design.md)及[综合核验](./20261006-QA-A18-completion-audit-01.json)完成当前同一 C18 产品的逐项合同，不把 C17 历史执行写为 C18 接受。

[真实 lifecycle](./20261006-terminal-observation-c18-real-lifecycle-01.json)actual exit 0：modern 连接／刷新恢复授权／撤销与 disconnect、账户与 chain 事件、遗漏 account／chain、错链、PersonalMessage 明确／省略 chain 及 Intent 验签、只签名 preview／final bytes／digest 验签通过。同源两 tab、异源伪造 origin、权限借用、外源 disconnect、兄弟 port 取消和导航的六项；锁定批准三入口、切换账户三入口、切换网络三入口；原 caller 取消六项；实际 account.signData 返回被持有后的 sign／execute × lock／network／account／cancel 八项全部通过，原方法及安全 guard 恢复，0 输出／journal 改动／广播。总模拟 27、Execute 0。

[当前一次执行](./20261006-terminal-observation-c18-public-execution-01.json)actual exit 0：独立固定 c18-public-execution-20261006-01 的公开 seed 7 账户最小单位自转账，digest EyHB7GuzjWB4e6dQvasj4WCEVaZCoGPgdSDFR9acMHMB。预览／final BCS／两次 checks ENABLED 的正式模拟／Intent 签名／effects／唯一 confirmed-success journal 匹配，完整浏览器重启后同记录保持。Execute 1、模拟 3，无自动第二次批准／广播，attempt／回执／私密恢复材料不覆盖保存。

[实际 UI／worker](./20261006-terminal-observation-c18-readonly-01.json)逐字匹配当前产物。[原七 journal](./20261006-terminal-observation-c18-original-journals-01.json)完整逻辑／effects 保持。当前 1106 源码 SHA 7fe90e95f706bea42453b596bf016194fb1a2ee6377428dcdff1d81f245e6383；BG c012b8514fd4eb063abe7a7f6f71532e83f00ac1241829568567e8b8cede5d24。C17 全产物和 02／03 网络切换失败 profile 保留；E8 只结束本次有原拥有者与完整物理结束证明的观察，不清未知旧 pending。

本次 headless Chrome 实际产品，无 SPKI／证书信任修改；测试网络切换 DevNet 只验状态／事件，未宣称其远端服务就绪。Fullnode HTTP 真实执行与三 HTTPS 普通 CA 失败分开；QA-A19／ENV-07、提交后完整故障 QA-A10／TX-10、独立部署权威及 trial 继续开放。QA-A18 完成，父总计 60/98（61.2%），trial_ready=false。
