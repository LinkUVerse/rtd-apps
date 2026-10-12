# NET-07：自定义配置副本恢复与重启后版本检查

日期2026-10-03。继续上一批完整配置主链。

后台新增仅UI可调用的getSavedCustomProfile：优先读取保留的wallet_custom_profile_v2，再兼容已保存的active自定义profile；不存在则返回null，不构造默认端点。读取非法版本报错且不写入。确认保存的revision与持久自定义副本比较，因此切回内置网络、worker重新加载后也不能以旧revision覆盖同id配置。

设置页从内置网络进入自定义表单时异步载入副本，载入只展示不切网，默认编辑版本加一；读取失败不展示空白覆盖表单；卸载后忽略迟到载入结果。保存仍须重新授权／身份预检及用户确认。

定向测试19/19通过（NetworkEnv12项、React表单7项），20261003-profile-restore-tests.log；完整TypeScript检查通过，20261003-profile-restore-typecheck.log。新增6项覆盖持久配置跨内置切换／模块重启恢复、旧版本拒绝、新版本保存、未配置返回空、坏数据保留以及表单载入失败。

本批新增真实扩展启动脚本scripts/test-wallet-extension-smoke.cjs，使用已安装Chromium153完整浏览器、临时隔离profile，不接触用户浏览器数据、不创建钱包或发交易。开发版Webpack编译通过（20261003-profile-restore-build-dev.log）。真实扩展启动与实链／权限授权／签名验收分别计数。NET-07仍待实际Chrome权限流程、设置国际化、自定义链demo等剩余验证。


## 真实扩展启动结果

Chromium153.0.8010.12完整浏览器成功加载实际开发版扩展manifest与background service worker，完整窗口进入#/accounts/welcome，显示欢迎页与zkLogin不支持提示，未产生pageerror。通过扩展UI真实runtime.Port发送getSavedCustomProfile，background返回null；不是函数mock。manifest包含的可选HTTPS／localhost／127.0.0.1／IPv6本地模式被浏览器接受。见20261003-extension-startup-smoke.log。

两次前置探测原始日志保留：popup-first-probe中页面关闭对应现有useFullscreenGuard将新用户引导到完整页面；button-first-probe等待button超时，因当前欢迎页“更多方式”实际为link，修正定位后通过。没有将两次探测记为通过，也未用放宽超时掩盖问题。

这只证明新profile的扩展加载、欢迎页及只读配置通信；没有建立真实账户、进入已登录设置页、完成权限授权、预检真实服务、证明全部网络流量或执行交易。下一步继续设置国际化、权限／worker真实流程和指定debug dev联调。
