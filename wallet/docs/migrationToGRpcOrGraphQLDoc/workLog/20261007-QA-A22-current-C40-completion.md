# QA-A22 当前 C40 界面与非 RPC 资产验收完成

[逐项独立审核](./20261007-QA-A22-current-C40-completion-audit-01.json)通过，父QA-A22按其实际界面范围完成；REL-02全业务抓包／ENV-07普通Chrome HTTPS／权限及NFT索引转移等仍分别开放，不能以本项完成表示试用已准备好。

| 父合同 | 当前实际证据 |
| --- | --- |
| 国际化与主题 | [32项实际UI](./20261007-C40-ui-preferences-apps-chrome-01.json)：中英文本和html lang；四主题实际CSS primary／surface互异、light／dark配色，renderer与完整Chrome重启保留 |
| 账户／密码／锁定 | 实际受控G3私钥导入、UI密码保护、正常解锁／重锁与完整Chrome重启；[后续密文10项](./20261007-C40-connections-cipher-chrome-03.json)encrypted projection前后与冷重启精确相同，完整journal三store不变；密文基线从32项之后开始，不声称创建时已采集 |
| 锁定设置 | UI零分钟禁用保存，10分钟保存与后台／完整Chrome重启相符；[真实自然alarm](./20261007-C40-auto-lock-alarm-chrome-01.json)另用正常UI暂设1分钟、关闭全部UI，59.948秒真实Chrome事件与账户锁定，密码解锁后恢复10分钟；0时钟／事件伪造 |
| 资产隐藏与分类 | 当前历史Display原始BCS／名称／32×32精确PNG与缺图说明；真实隐藏／scoped H0+generation+account存储／renderer与完整Chrome重启／还原、非视觉能力分类，均[独立审核02](./20261007-C40-ui-preferences-independent-audit-02.json)；图片已在受控目标、缺图NFT已在framework wrapper，历史source卡片不等于当前持有 |
| 链接与设置 | 三个实际HTTPS支持／FAQ／条款链接，当前Local选择、注销确认正常取消及账户保留；不开外站，不声称外部业务集成 |
| 授权窗／支持应用 | [真实中英连接10项](./20261007-C40-connections-cipher-chrome-03.json)：modern demo实际HTTP警告／拒绝／批准弹窗、已批准非空卡片、钱包界面断连与demo授权变空；未验证站点明确安全性未知，无权限／storage播种 |
| 未对接业务与空态 | 两语言目录／连接各自明确空态；权限仍加载时不能当空态、已批准非空卡片仍可撤销；法币明确不可用且无购买按钮 |

编码10定向／186文件2637全量／最终两类型exit0、独立production及5285模块／2036源码／7chunk完整闭包。1119产品源码SHA77df9a7637df9dbe4f08ef22caaf52744bd87c3f8626b9910dea47bb7dc12c39。C39／C40所有生产map的2022唯一源集合相同，仅三应用组件与两语言字典5源变化；dApp-interface及content-script字节相同。未重复既有任何实链签名或摘要；本批32+10及alarm均0模拟／签名／Execute。

C39前四次工具失败与两旧空态缺陷诊断保留；C40连接01／02失败因测试窗口bounds不匹配（真实demo错误），03采用既有800×600窗口参数完成，没有修改产品弹窗算法。独立native审核01误判缺图NFT旧owner而失败，02按真实framework wrapper恢复审核；注册01在任何操作前因旧计划两个runtime SHA已被系统重启恢复替换而失败，02使用独立恢复holder且其余旧immutable SHA保持。所有失败不改写成功。

新入口实际Origin omkbkbjpbnpnmfapnphjodcoipdikmpf，60门禁／9H0／3私有CA TLS；28容器／14明确healthy，两SQL/HBase／两个publisher与25严格原命令均已实际复核。确认弃用C39无数据入口按精确ID清理，合计21个临时容器，无卷／镜像／配置或genesis删除。服务进程与运行水位的观察成功不代表所有业务ready。

QA-A22完成后**81/98，余17，trial_ready=false**。framework十字段共同窗口仍101942–123446，未达180806；名称当前高度新鲜度和执行后刷新继续。当前完整JSON-RPC迁移目标仍active，不以本父界面验收结束目标。
