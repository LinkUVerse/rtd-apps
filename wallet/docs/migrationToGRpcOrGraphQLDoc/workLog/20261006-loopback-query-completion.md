# 独立回环开发查询入口J1–J5有限完成

2026-10-06，父69/98未增加。遵循原archive第五章的literal localhost／127.0.0.1 HTTP开发例外，新增独立revision3及三URL（39610 GraphQL、39613 Archive、39616 Account），原rev2 HTTPS／候选05／dist／ZIP03原样保持。

[有限综合审核](./20261006-loopback-transport-audit-01.json)通过：[普通Chrome四角色H0](./20261006-loopback-chrome-readonly-02.json)全部HTTP200、完整H0一致、末grpc-status0、实际UI三脚本及worker与隔离候选逐字一致，0外部请求／页面错误／模拟／签名／Execute，没有证书例外或信任改变。五个实际负面HTTP请求证明错误origin403、已知路径GET403、错误路径404、Archive Execute404及错误Account路径404。

link-u-smart-contract/localDeploy脚本启动仅绑定127.0.0.1的新Nginx，后段严格私有CA＋DNS localhost SAN验证，既有认证TLS／mTLS／publication／min／deadline／CORS／method检查均仍在真实原入口执行，不代理原生服务来跳过认证。只有新增listener为修正而停换两次，原dev、链、消费者／归档入口未停、未重建。原8最新debug／当前HEAD／diff及3入口文件字节在启动后均核对。

独立新revision的四包声明仍由原24,451认证检查点与固定OriginByte上游源码／编译模块重新核验生成，非HTTP观察自授权；声明SHA7549c394a0fa10bf5479fefe8a8644dacb682aa5bce3f43dc30bb1ae4b38067d。隔离生产候选5277module／2033source／7JS完整闭包通过，产品f867a8d4／1108文件不变；2旧编译告警，无新全量单测声明。

保留两次启动前失败（历史白名单多一个origin、只读容器默认临时目录）、IP作为Nginx验证名称导致502及原HTTPS实际503、首轮Chrome三入口因精确白名单返回403的全部日志／目录／源码。改用真实证书DNS localhost；[新listener精确origin绑定](./20261006-loopback-origin-binding-01.json)只增加实际已核验候选origin cllminnijeikaaelppgmimificelclcf，原HTTPS白名单未改。解压路径会影响无manifest key的开发扩展ID，未制作／声称新固定ID可试用ZIP；本候选固定路径有效，最终安装授权仍归ENV07／REL。

实际生产WalletAssetReader在S625163读取0xaaa／0xbbb OwnerToken、完整owner与类型过滤／隐藏分类，0签名／派发：[实际读取](./20261006-loopback-owned-assets-01.json)。实际AccountHistoryReader在586007–625150完成窗口／旗标／末验，目标0条、registrationComplete与两全集旗标false，不能替代非空账户历史或全集验收：[窗口读取](./20261006-loopback-account-history-01.json)。新真实Chrome能力R1–R5已设计并开始。

HTTPS系统信任验收和HTTP开发业务验收分别计数，ENV07／QA19仍开放，trial_ready=false。依据[Chrome官方跨域权限说明](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests)和[Nginx官方proxy_ssl_name／verify说明](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_ssl_name)；本地开发例外属于RTD受控配置政策，不宣称Sui新增传输规范。
