# TRY-06 可装载验收包实施前设计

TRY-06只签认产物初步清理与可装载包；TRY-02／05、ENV-07及其余RPC／TX／QA开放时，不宣称完整可试用。

以独立认证四包registry生产候选03为源：实际构建、全5274模块／2032源码／7块审计和新profile普通Chrome装载证明均已通过。当前ChromeFullnode同H0，三个HTTPSTypeError保留；零外部／模拟／执行请求，原开发dist不变。

1. 新打包器读取原构建、闭包审计、Chrome来源证据，确认当前产品SHA与所有源产物SHA保持、UI三脚本／background与源相同。
2. 仅复制可加载扩展文件，排除compilation-graph.json和source maps等审核材料；JS、CSS、manifest和运行资源逐字保持。保留LICENSE资源。包内不包含账户库、私钥、运行日志或DB。
3. 使用全新受控runtime目录和ZIP，逐成员核验解压字节与文件SHA，拒绝符号链接和路径穿越。固定顺序、时间和权限，便于重现。
4. 对最终解压目录重新执行普通Chrome只读装载及字节／抓包审核，不修改系统信任、不使用SPKI例外。成功仅表示可装载与本次观察无旧／外部请求。
5. 工作日志及安装说明包含包SHA、全部成员SHA、debug／profile来源、证书缺口与已验／待验清单；完成TRY-06不自动满足其它TRY／trial_ready。
