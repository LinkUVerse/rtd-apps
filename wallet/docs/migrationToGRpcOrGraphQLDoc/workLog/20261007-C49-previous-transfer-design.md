# C49 已转出NFT与滞后索引下的实际准入验证

V49-1：先核实C48六成功、当前未覆盖524022、旧snapshot上界低于六执行检查点，使用新的C49唯一临时gateway及空profile。原C48已签名profile不重开；原NFT六笔不重签／发送／注资／seed。

V49-2：当前C46实际UI用source账户尝试六个已转出NFT的旧路由。如果索引已刷新，应直接无转移表单；若真实滞后索引仍显示旧持有关系，则Review必须由fresh原生owner／dynamic field关系在模拟前拒绝，零approval／模拟／签名／Execute。抓取原Request／Response，所有journal和密文保持、正常重锁。不能注入snapshot、改owner或屏蔽业务响应。

V49-3：独立核验原native规范BCS／owner／previousTransaction与六真实转移摘要、实际UI拒绝及零模拟／签名／Execute、原journal／1015私有文件保持；不将旧快照持有关系当作当前native所有权。

V49-4：确认完成后精确正常清理唯一自有gateway，累计52，原29／14及全局未知退出容器保持。原R48写后覆盖仍等待524022，不据此完成完整父项。
