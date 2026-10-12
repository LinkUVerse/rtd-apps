# TRY-06 初步产物审计与可装载包完成

按[实施前设计](./20261006-TRY-06-package-design.md)完成原TRY-06合同，父63/98（64.3%）；**trial_ready=false**，全部功能抓包、HTTPS与核心试用余项仍开放，不据此勾TRY-02／05或REL-02。

独立生产候选03实际构建、完整5274模块／2032源码／7块／5入口审计通过，当前产品1106／SHA609dfb4e不变，原开发C19 dist不变。独立认证四包registry的UI／background AST字面量匹配；构建审计器8项通过。首两次配置审核失败及产物保留，根因是ts-node的allowJs／ES5且无downlevelIteration使Set展开失效；改为Array.from并加入同钩子回归后第三次实际通过。不是钱包产品源码错误，不丢弃失败或把首次失败改写成成功。

最终[ZIP包](/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261003-01/rtd-wallet-dev-20261006-01.zip)2,526,064 bytes，36个运行成员，SHA256 bc9b8ebe62c7ee54d62ebcd8db85d9d2c0741b8cffeeacfcffc425b90b20208a。排除审核graph／source maps，保持全部JS／CSS／manifest／资源与编译输出逐字一致，ZIP全部成员CRC／SHA及目录字节核验通过。不含账户／密钥／journal。[打包证明](./20261006-TRY-06-package-01.json)。

最终解压版目录已在全新普通Chrome profile实际加载，新UI三脚本与后台逐字匹配包成员，初始页及默认恢复alarm通过。零外部／forbidden请求、零page error；Fullnode HTTP同H0通过，三HTTPSTypeError仍失败。[最终目录Chrome证据](./20261006-TRY-06-package-chrome-01.json)。本轮只观察新装启动流量，不声称所有功能运行零旧请求；静态产物清理是初步范围，完整实测归REL-02／QA-A21。

[复合完成审核](./20261006-TRY-06-completion-audit-01.json)固定构建、闭包、registry、原dev dist、ZIP及最终装载来源。未导入CA、未绕过证书；零账户签名／模拟／Execute，原七journal保持。安装与回归范围见[说明](../14-开发验收包安装与回归说明.md)，可装载候选不等于完整可试用。
