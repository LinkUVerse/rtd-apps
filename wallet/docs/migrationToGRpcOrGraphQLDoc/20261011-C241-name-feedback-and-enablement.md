# C241 名称入口与失败提示真实修复

普通C51 Chrome现安装C241，账户/扩展ID/权限/网络配置保持，完整C240已保留。C240原修复只覆盖解析异常，浏览器复验失败揭示另一个根因：本地关闭远程features后，GrowthBook空配置被`isOn`当成禁用，名称表单未进入解析分支。

最终实现：已配置名称部署时默认启用，显式false继续关闭，无部署或错误类型flag不能启用。合法名称的“功能未启用”“服务/覆盖不可用”“无收款结果”各自提示；不改变生产链身份、NAME覆盖、新鲜性、发送前重查和授权边界。

验证：54名称定向、199文件/2864完整回归、两项类型检查、生产构建、闭包与6个模块差异审核均通过；后台模块/权限/部署registry未变。C240首轮4时序失败及最终普通Chrome失败均保留，不混作通过；C241完整回归首轮通过。

真实原生Chrome：名称`wallet-migration.rtd`显示“名称暂时无法解析，请等待索引同步或检查网络后重试”，检查按钮禁用。改填原测试账户完整地址后恢复费用0.002988 RTD，检查页收款人明确为0x9d7652713f02b13b73744ba47e4f21ca0a0a2966cc02df86adcde2041454e5bc，金额0.01 RTD，摘要EzeuJXXwP28deHFvgZFjUHnbvip6ivAhpr7SRfcrarMK。完整模拟BCS及effects摘要与UI一致；未签名或执行。

44实际请求中2个取消保留为取消，其余42 HTTP200；5个名称准入实含四个NAME覆盖，均只到1006768，低于实读native。没有把名称正向当通过。三入口全部业务流量仍归REL-02，当前这段未触发归档。

证据：[真实UI/网络/BCS审核](./workLog/20261011-C241-name-native-audit-01.json)、[实际加载代码](./workLog/20261011-C241-ordinary-bytecode-01.json)、[源码与检查](./workLog/20261011-C241-source-and-checks-01.json)、[原始HAR](./workLog/20261011-C241-name-and-normal-recipient-01.har)。

当前QA-A15仍需正向/改名续期/过期/反向等完整合同；后台连续六次4小时发布超时的阻塞已列[C242](./workLog/20261011-C242-publication-blocker.md)，继续处理而不降低验收门槛。总体保持93/98。
