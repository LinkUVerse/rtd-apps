# C120 独立完整中间件网络恢复方案

首次实际启动在 Docker 创建默认网络处因 `all predefined address pools have been fully subnetted` 失败，自有容器、网络、卷均为零。首次 start-attempt、命令及失败文件保留，禁止覆盖或借此修改其他项目。

依据 [Docker Compose 网络官方定义](https://docs.docker.com/reference/compose-file/networks/)，在原完整 Compose 的新副本中仅增加 default bridge 的显式 IPAM `172.16.120.0/24`；由 Compose 自己创建并标记这个独立网络。原 spec、manifest、Compose、私有 CA、九服务、六持久卷、全部只读 bind、镜像和端口逐字保留。新副本经对象逆变换和实际 Compose 渲染对比；源码另存且完整逆变换到 C120 原管理器。

部署前再次读取所有 Docker 网络及 macOS IPv4 路由，精确拒绝与专用 /24 重叠的网段；default 和 split default 不代表专用路由，除此以外不忽略路由。要求项目零现存资源、三个 loopback 端口空闲、C116 原完整归属、原准备文件 SHA、两种 12GiB 余量和首次失败证据成立。专用 selector 仅允许这个明确 TARGET/compose.json 返回审核过的新副本，其他调用仍使用原 selector；不改 archive 公共部署源。

恢复操作采用独立 network-start-attempt、命令、全局 before 和实际 after 文件。六角色启动沿用原 dev_workspace 完整初始化／健康／十四表及 Java gateway 检查；不跳过任何服务或原存储门。独立审核实际网络 CIDR／Compose 标签、六容器配置和健康、原运行身份及 PG TLS／S3／HBase 协议。初始化 --rm 临时容器如实计数。

本轮仅部署前置中间件，不注入未正式发布的 checkpoint，不中断工作发布器或两条链。正式 709569、十四 HBase／23 SQL／八 CF／四 Rocks／Display／两账户、完整空重建和同时 cold、换 H0／generation 与浏览器验收合同保持。NFT 业务验证继续第二阶段；部署准备或健康不能勾选原开放父项、NN-01–09 或 trial_ready。
