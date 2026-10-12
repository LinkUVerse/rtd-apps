# 2026-10-04 实际扩展 Origin 与认证桥接读取

从当前 dist 实际加载的 service worker 测得扩展 Origin 为 chrome-extension://iabmfhchcocfljednlcpgnijajedhecc。该 ID 绑定当前扩展加载路径，不保证不同安装路径或发布包一致。

部署变更使用 link-u-smart-contract/all-in-one-deploy/localDeploy/add_wallet_bridge_origin.py：校验旧manifest与renderer SHA，仅加入这个明确Origin；保留before-extension-origin原配置，验证Envoy配置后仅重建桥接容器，无改链和数据库。未来重用start_wallet_archive_bridge.py时需同时传原https://wallet.test与此扩展Origin。

wallet/scripts/probe-certified-extension-bridge.cjs 使用Chromium153.0.8010.12、临时隔离profile、原始dist。在真实扩展ui.html中执行浏览器fetch，访问TLS39603/archive→mTLS准入入口→真实Ledger，HTTP200、protobuf H0正确、checkpoint100、grpc-status0；证据见[浏览器读取](../evidence/20261004-extension-certified-bridge.json)。没有拦截响应或以fixture替代链。

开发私有CA未安装到系统：测试仅指定当前桥接叶证书公钥SPKI例外，未使用全局ignore-certificate-errors。此证据不证明正常CA信任流程。也没有创建账户、配置钱包网络或执行交易，不能替代完整钱包核心链路。

首次定位Playwright依赖使用错误的root node_modules路径失败，改为wallet/node_modules后加载成功；首次响应断言误要求grpc-status冒号后空格，真实返回grpc-status:0，修正合法空白解析后重跑通过。失败探针不计通过。

当前publisher20639、GraphQL58173、query admission19053通过实际ps仍运行；没有因长时间追赶而重启publisher。接下来需要GraphQL浏览器CORS、Fullnode入口、实际网络授权／预检、核心交易及账户服务。总体18/98，不宣称可试用。
