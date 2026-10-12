# C279：当前 G4 名称完整验收收口

QA-A15 的八个子包全部完成；REL-02.9 复用相同名称证据。按主人允许重置 dev 环境的指令，当前正式测试窗口为 G4，H0 为 `BTrU3deMDbnWcUWLJ2ruDj9vbCC4gaYnVj8qV3K2nFah`，部署代次 `dev-20261011-04`，普通 C51 Chrome 安装 C278。原 G3 记录保留，本次不混用 G3 的正向样本。

## 当前配置反例与恢复

通过普通 Chrome 原生界面依次执行，HAR 在开始前清空，未使用浏览器数据库或注入修改配置：

1. 原 G4 全部入口保持，将预期 H0 改为旧 G3 的 `BkuLHhdtnoK7yLxo2eQuvcjHtdyipE7MMyxgTJiyHGg4`。预检显示“钱包查询入口属于不同链，已停止接纳数据”，没有确认保存入口。
2. 恢复 H0，将 forwardRegistry 改为实际 Clock 对象 `0x6`，保持原配置标识和 revision=2。链身份预检通过，但确认保存被“修改现有网络时必须增加配置版本”拒绝；没有把预检通过当作合约资格。
3. 使用独立配置标识 `c278-name-registry-negative`、revision=1，保存同一错误 registry。旧发送草稿被清空。输入 `wallet-renamed.rtd` 和 0.001 RTD 后，页面显示“名称没有可用的收款地址，请检查后重试”，检查按钮禁用，费用显示同步失败。错误注册表三次真实字段读取均为 null，未沿用旧名称目标。
4. 恢复原 `c51-tls-acceptance`、revision=2、完整 H0、generation、四个服务 URL 和全部 packages。确认后表单自动建议下次 revision=3，原发送草稿再次清空。重新输入相同名称和金额后，费用为 0.002988 RTD，检查按钮可用。五条恢复后的名称字段均指向原 bad0 完整地址。

[原生 HAR](./20261012-C279-name-registry-negative-01.har)共 269 请求，[独立字段和协议审核](./20261012-C279-name-registry-audit-01.json)通过：104 GetServiceInfo、120 GraphQL、23 ListBalances、14 GetObject、3 GetBalance、3 ListOwnedObjects、2 自动费用模拟；0 VerifySignature、0 ExecuteTransaction。7 条取消或没有成功正文的例外保留。Fullnode、archive 和 GraphQL 的 H0 均为 G4，全部目标为既有本地服务，无旧 JSON-RPC。

此处证明当前配置的错链、registry 变更拒绝及恢复；不将其描述成链上 registry 根对象替换，也不替代 QA-A17 全部迟到响应矩阵。错误 registry 的名称提示仍较通用，但不会给出错误收款地址或允许发送。

## 八项合同与复用证据

| 子包 | 已成立的实证 |
| --- | --- |
| QA-A15.1 | C241 名称启用/错误提示及普通地址回退；当前 C278 延续该实现。 |
| QA-A15.2 | C277 原生字段/Clock 当前校验；C278 续期和改名后旧索引实际被拒绝，随后新索引通过。 |
| QA-A15.3 | C277 同一 G4 正式窗口八案例，主名称和叶子正向通过，普通 Chrome 实际解析通过。 |
| QA-A15.4 | 当前默认反向正向回查通过；账户名称与地址分别展示，链接指向真实地址。 |
| QA-A15.5 | 真实缺失、过期、无目标、错误祖先 NFT、过期反向；缺失/过期 Chrome 禁用检查。 |
| QA-A15.6 | 实际续期 cp4614、改名 cp4699 各一次；原名移除、新名解析、默认反向及 UI 更新。 |
| QA-A15.7 | 本文错 H0、错误 registry 当前 Chrome 拒绝和原配置恢复。 |
| QA-A15.8 | C278 UI 完整目标、模拟/签名精确字节、一次名称转账 cp4594、原摘要/余额/历史闭环。 |

源证据见 [C277](./20261011-C277-current-name-validation.md)、[C278](./20261012-C278-name-address-approval.md)。过期名称在续期前的结果与续期后的结果分别绑定实际 checkpoint；`wallet-migration.rtd` 在改名后已失效，不能重跑旧预期并冒称当前状态不变。

本轮没有修改产品源码、安装新版、签名新交易、重置数据库或删除旧链。后续仍需完成 QA-A17、QA-A20、REL-02 的其他流量和 REL-05 完整交付审核。
