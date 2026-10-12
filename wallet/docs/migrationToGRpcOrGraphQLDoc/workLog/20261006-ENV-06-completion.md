# ENV-06与响应消息预算收口

本项完成传输协议、有限资源预算及持久部署合同，父任务计数54/98。正常Chrome CA／完整host权限、账户共同快照与完整试用仍分别归ENV-07、RPC／TRY／QA，trial_ready=false。

补充本次C16只签名真实进程终态：[sign-only01](./20261006-message-budget-sign-only-01.json)actual exit0、3模拟、固定摘要及Intent验签通过、Execute0；原journal只读核验与独立签名profile分别留证，不扩展为外部dApp最终出口或完整授权通过。

钱包全部实际binary客户端在SDK消费前检查帧头：消息64MiB、trailers64KiB、单调用累计128MiB；跨chunk解析、声明超额立即取消、无整包缓冲、不重试。18新增边界、171文件2426完整回归、类型及稳定C16构建通过。产品1084份源码SHA36698f9a、UI dc82651a／后台d1fb12b5，fresh Chrome当前两入口逐字匹配。七条原journal在本次原生升级后逻辑与effects保持，7只读查询、0模拟／Execute。[原生codec](./20261006-message-budget-native-03.json)四项真实Tonic验证含精确边界、stream终态、Zstd压缩后长度与真实64MiB超额。测试01／full01／build01等失败均保留，不覆盖为成功。

[最新8 debug构建](./20261006-message-budget-eight-debug-build-02.json)稳定源码，实际三变化产物为rtd／rtd-node／rtd-kv-rpc；另外五消费者字节相同保留原PID。[辅助重编](./20261006-message-budget-publication-build-01.json)实际三摘要变化，因此按协作SIGTERM暂停旧publisher，原命令、缓存、pending与epoch保留，不能沿用“辅助字节不变可留进程”的旧条件。原准备installer与停止记录逐字留存，Ledger及核心停止中的身份变化使两次流程拒绝；之后只在原PID／命令确已不存在、端口空闲、源／配置／安装intent仍符合冻结记录时显式继续，不重复信号、不强杀、不自动重放。17个安装守卫测试通过。[实际安装exit0](./20261006-message-budget-install-finish-01.log)新核心43153／Ledger43159启动，最新源／8debug／3辅助及metadata绑定匹配，数据库与协议配置保留。

[新核心同链](./20261006-message-budget-core-after-02.json)三原回执与余额保持、834039→834101真实推进、0模拟／广播；准备期过早读取的lsof失败留存。随后原生守卫标记ready，并按原timeout7200／四审计worker／15秒间隔及完整replica/control门槛[恢复publisher](./20261006-message-budget-publisher-resume-01.log)。running／healthy仅为当时监督状态，不证明pending完成或业务共同S成立。

固定Envoy沿原精确13方法、Origin、TLS/mTLS／可信头剥离／min／timeout及无重试，仅新增128全局downstream连接与每HTTP2连接64流。[固定源码33协议](./20261006-ENV-06-candidate-pinned-01.json)实际127保留／7拒绝、64合法流PING成功、第65条流导致连接关闭；没有将关闭写成收到RST。测试输入摘要固定，三项升级守卫测试通过。原bridge字节备份、独立prepare／apply intent，实际仅重建bridge。[部署后审核](./20261006-ENV-06-bridge-postupgrade-01.json)固定镜像／只读挂载／unless-stopped与bounded renderer一致；[真实同链20请求](./20261006-ENV-06-bridge-live-01.json)binary/text unary及五帧stream、末status／trailers、历史selector、min及错误保持，0模拟／签名／Execute。[正常启动入口复验](./20261006-ENV-06-persistent-start-02.json)实际接受持久bounded配置，container保持同一；首次METHODS导出假设失败保留，启动器从原renderer读取同一白名单后通过。

预算层次明确：Tonic64MiB检查在编码、可选压缩之后，超额OutOfRange且测试到终态无超额DATA；它不是handler对象分配或解压膨胀上限。4MiB请求buffer、连接buffer、原生消息体限制与钱包累计调用限制各自独立。64MiB为RTD本地政策，不宣称Sui默认相同。[固定Tonic源码](https://docs.rs/tonic/0.14.6/src/tonic/codec/encode.rs.html)、[固定Envoy HTTP2源码](https://github.com/envoyproxy/envoy/blob/v1.39.1/source/common/http/http2/codec_impl.cc)为核对依据。

01:23只读TLS SQL最小392485／Display392491已live继续；consistent及GraphQL ledger仍586007，尚无完整业务共同S。原stdout诊断因没有可解析近期watermark失败保留，真实SQL／native range分别记录，不伪称追平。所有原失败、旧pending及原文档均保留。
