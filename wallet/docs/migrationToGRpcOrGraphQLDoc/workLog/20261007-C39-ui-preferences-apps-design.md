# 当前界面偏好与应用入口验收 U1–U6

原设计时父QA-A22／REL-02开放，初始C39真实UI记录保留；实际最终验收版本为C40（QA-A22已完成、REL-02仍开放），独立受控Chrome profile，主人原pending／账户profile不打开。不播种journal／storage／响应，禁止Simulate／Execute／签名及外部站点访问。

- [x] U1：当前八debug／原H0／C40 1119源码产物和实际UI／worker一致，受控导入／密码保护／锁定／解锁，原journal三store全空且保持。
- [x] U2a：真实中英语言和四主题，实际文本／选择／CSS颜色／storage、renderer重载保留已实测。
- [x] U2b：完整Chrome重启后的语言／主题保留。
- [x] U3：真实自动锁设置0无效、10分钟正常保存／后台一致／重启保留；注销确认正常取消，不删账户。设置证明不代称计时alarm。
- [x] U4：同S历史Display图片／无图说明、非视觉能力、真实隐藏／恢复与scoped preference、完整重启保持；已转出NFT seed持有者仅历史，不据旧快照构造新批准。
- [x] U5：应用与连接列表明确空态，未对接法币说明／无购买按钮，支持链接和当前网络菜单。不开外站，不称业务对接成功。
- [x] U6：实际支持dApp连接／断开／授权窗、当前国际化及完整UI矩阵独立审核，全部合同成立后才勾父任务。

任何收集器差异须和产品缺陷分别记录；骨架屏不能当明确空态。普通Chrome HTTPS仍按ENV-07／QA-A19验收，不重发任何旧digest。


C39原工具01引用已废弃menu-testid、02主题选择器误命中背景radio、03保存选择器误命中账户昵称隐藏submit，失败工具／记录均保留。04按实际可访问设置按钮和设置内主题radio／可见Save收集20项成功检查：两语言／四主题CSS和renderer保留、自动锁0拒绝／10分钟保存与后台一致、三个支持链接／Local菜单、注销取消、Display/隐藏/renderer保持。整体在完整Chrome重启失败，原后台unlock返回后立即导航被仍锁定的UI缓存守卫引回tokens，未认为隐藏记录丢失，不预勾U2b／U4重启。

[保留C39独立诊断](./20261007-retained-C39-apps-empty-diagnostic-01.json)使用正常UI解锁、等待实际lock按钮出现后导航；原完整journal不变、重锁、0模拟签名Execute，两列表实际只有骨架且无空态，缺陷确证，当前C40按[空态改造](./20261007-apps-empty-state-design.md)继续。C39 build1118已为历史；当前工作树C401119、新产物验证中，原C39全部artifact保持。后续C40完整restart使用正常UI解锁并等待可见账户解锁状态，不修改store／路由守卫。


后续按当前C40独立生产[真实32项](./20261007-C40-ui-preferences-apps-chrome-01.json)及[原响应和native独立02](./20261007-C40-ui-preferences-independent-audit-02.json)补齐U2b／U3／U4／U5；U1当前改为1119产品源码77df…的实际导入密码保护／锁定／正常UI解锁且完整journal保持，账户密文另按[C40 C1–C4](./20261007-C40-connections-cipher-design.md)采集，不冒称C39曾通过完整Chrome重启；U6当前实际双语言连接授权／卡片／撤销和整体矩阵继续。auto-lock设置10分钟与后台及重启一致，计时alarm未单独实测。所有C39失败原样保存。

U1／U6由当前C40[独立父验收](./20261007-QA-A22-current-C40-completion.md)及42实际UI／自然Chrome alarm／后续原密文基线／2022源保留完整补齐；清单首段C39标记为原设计时间，真实全项完成版本为C40，不将失败旧轮改称通过。父QA-A22完成，普通ChromeHTTPS和全业务抓包等其他父范围保持开放。
