# ENV-07：普通TLS与独立浏览器profile

[普通CA探测](./20261006-ENV-07-normal-ca-before-01.json)进程exit0只代表探测完成：三HTTPS角色均TypeError，networkIdentityAccepted=false，不能记TLS验收通过。当前UI与worker逐字对应C16；未导入或改变证书信任。

三个入口共同本机CA PEM SHA256为b8d2735d1cf7489f82001d4bc33fdedeccd54dd940680cd7be7da5adcc15d556。[Chromium官方FAQ](https://chromium.googlesource.com/chromium/src/+/main/net/data/ssl/chrome_root_store/faq.md)说明支持浏览器证书管理；[macOS信任实现](https://chromium.googlesource.com/chromium/src/+/main/net/cert/internal/trust_store_mac.cc)跳过按应用或主机名限定的系统信任，不能假称这种限定适用Chrome。

拟使用本任务独立chrome-ca-review-20261006-01 profile，仅导入公开开发CA、不修改系统钥匙串或其他profile。电脑控制工具要求改变证书信任前确认，已向用户提出；确认尚未收到。打开的导入文件选择器已取消，等待CA文本的审阅进程超时exit1保留；不存在导入成功证据。确认前不进行导入，继续独立任务。

获确认后才执行可见证书管理操作，核验CA指纹和持久化，整浏览器重启；真实扩展UI/worker在无SPKI例外、无ignore-certificate-errors、无ignoreHTTPSErrors和无CDP安全绕过条件下读取同H0。还需真实host permission批准与拒绝合同；账户历史coverage单独验收，三角色TLS成功不能代替完整四入口ready。ENV-07继续未完成。
