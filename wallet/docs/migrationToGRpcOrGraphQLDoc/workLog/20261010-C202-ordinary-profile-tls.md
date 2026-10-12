# C202 普通Chrome独立profile正确TLS验收方案

C198已实际确认私有CA被Chrome拒绝。当前Chrome证书管理器显示macOS导入7份、用户自定义0份，支持“由您安装→可信证书”。Chromium官方[SeparateTrustPerProfile实测源码](https://chromium.googlesource.com/chromium/src/+/HEAD/chrome/browser/net/cert_verifier_service_browsertest.cc)验证每个profile的自定义服务端信任隔离；其正确/错误约束和不可信证书案例仍执行验证。没有以HEAD源码替代当前浏览器实际结果。

准备将当前网关已使用的公共CA证书导入独立C51 profile自定义信任库，证书CN=RTD local workspace CA，DER SHA256=3BD1655519C6E6DD2837BA19E903ED21F93216EA60D8C1B6079F23CFF3AAE4B0，有效期2026-10-06至2027-10-06。只影响此测试profile对该CA签发证书的信任；不改系统/登录钥匙串、日常profile或绕过浏览器警告。用户已明确批准且通过正常UI导入，仅C51自定义可信证书1份，指纹一致，macOS导入证书仍7份。正确地址Chrome显示连接安全（GET404，仅TLS通过），错误SAN明确NET::ERR_CERT_COMMON_NAME_INVALID；扩展UI/worker与host权限完整矩阵仍开放。

- [x] P202-1：官方隔离依据、当前原生UI、证书身份/有效期、最终选择准备。
- [ ] P202-2：用户确认后普通UI导入，核指纹/自定义信任与原macOS数量，实际正确TLS、错误SAN和UI/worker等完整矩阵。

证据：20261010-C202-profile-ca-import-prepared-01.json。尚未计TLS成功或ENV/QA父完成。

C203/C204后续：UI和worker实际HTTPS、权限取消拒绝及完整重启已通过；已授予站点权限撤回也实际拒绝。当前恢复原权限等待用户确认，详见[最新日志](./20261010-C204-restart-revocation-progress.md)。早期准备/未验描述保留其历史时点。
