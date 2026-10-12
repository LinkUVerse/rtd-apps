# 普通 Chrome 安装入口复核



## 普通 Chrome unpacked 安装方式（2026-10-07 官方复核）

Chrome 官方说明从137移除普通 Chrome 的 `--load-extension` 命令行入口。因此，Chrome for Testing 中采用该参数的页面测试，不能证明普通 Chrome 已安装钱包。普通 Chrome 开发包应通过扩展管理页的开发者模式和“加载已解压的扩展程序”安装；必须继续核验实际扩展 ID、UI／MV3 worker 字节与 host permission。加载方式不改变 CA、SAN、H0、generation 或业务覆盖验收门。官方依据：[Chrome 137 变更](https://developer.chrome.com/blog/extension-news-june-2025)、[开发包分发方式](https://developer.chrome.com/docs/extensions/how-to/distribute)。

如采用 Chrome DevTools for agents 的安装工具，需显式启用 `--categoryExtensions` 并提供 unpacked 目录的绝对路径；工具是否在当前会话可调用须另行核实，不能把文档中存在此工具当作已经安装成功。[官方工具说明](https://developer.chrome.com/docs/devtools/agents/extensions)。

本机仅通过应用包元数据确认普通 Chrome 154.0.8037.92；此观察没有启动浏览器、安装扩展或修改证书信任。后续仅新建独立测试 profile，保留全部已有钱包 profile。普通 Chrome CA 既有确认尚未返回，安装元数据及当前 isolated loopback 网关的 Chrome for Testing 结果不能替代其验收。运行状态及限制以钱包 workLog 和 totalProgress 为准。

[本机原元数据](./20261007-ENV-07-ordinary-chrome-metadata-01.json)仅证明版本。双方技术方案已同步该段；ENV-07／QA-A19 完整父任务保持未勾选。没有新增安装、权限、证书或资金操作。
