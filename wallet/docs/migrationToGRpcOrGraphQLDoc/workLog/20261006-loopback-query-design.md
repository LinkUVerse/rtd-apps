# 独立回环开发查询入口J1–J5（实施前）

当前69/98。原archive第五章及合并06明确HTTPS生产、localhost／127.0.0.1 dev例外；当前profile.normalizeEndpoint严格接受literal回环HTTP。新增独立端点与revision，不修改既有HTTPS profile或声明正常ChromeHTTPS完成。CA授权问题保持待决，不导入／忽略证书／SPKI。

| 子任务 | 交付与验收 |
| --- | --- |
| J1 | 核对原政策、Chrome官方host permission、既有三入口manifest与CA、8最新debug及H0；独立端口／目录只属于本批 |
| J2 | 在link-u-smart-contract/localDeploy新增loopback-only透明入口脚本；只代理既有认证TLS入口、私有CA严格验证、方法／Origin／路径限制，不跳过publication admission或改数据 |
| J3 | 生成独立revision3 HTTP开发profile，从原认证离线包证据重新绑定独立声明；原rev2、候选05、dist、ZIP03保持；新候选隔离编译／完整闭包审核 |
| J4 | 普通Chrome无证书例外实测新四角色H0及源字节，所有HTTP响应／grpc末status独立验证。HTTP开发结果与原HTTPS信任验收分别记录 |
| J5 | 更新双方架构／Task／workLog／进度，随后当前新profile全业务资产／历史实测；只凭新增入口启动不勾ENV07／QA19或完整业务父项 |

Chrome官方说明扩展UI／worker跨origin fetch须有host_permissions，HTTP与HTTPS权限分别配置：[Chrome network requests](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests)。回环HTTP是现有开发策略，不宣称Sui标准强制配置。新listener由127.0.0.1映射，后段验证原CA及127.0.0.1 SAN，保留原TLS桥的mTLS、可信头剥离、原method／CORS／min／deadline与publication检查，0重试。仅公开查询URL进入钱包，不带NodeTLS／私有证书到扩展。
