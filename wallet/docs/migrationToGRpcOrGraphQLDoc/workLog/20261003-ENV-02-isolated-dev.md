# ENV-02：保留原链的独立 debug dev 与真实读取

2026-10-03。原 archive-events-chain 仍由 rtd-recovery PID 88654 使用；不停止该进程、不删除数据库或 LOCK。该旧进程不计作最新 debug 环境。

重新核验当前 rtd HEAD、全部六个 dirty 文件及两个 debug 二进制 SHA256，与当日成功编译记录完全一致。见 evidence/20261003-rtd-debug-reverified.json。未修改 rtd 源码。

指定 link-u-smart-contract 仓库新增 all-in-one-deploy/localDeploy/initialize_wallet_dev.py，复用已有订阅配置脚本和 checkpoint／内部健康就绪检查。只接受全新目录及两个空闲非特权端口，固定 target/debug/rtd，显式 --network.config；不调用原一键部署的全局停止或清库逻辑。初始化失败保留现场。测试密钥和完整节点日志仅保存在权限0700的私有运行目录，文件0600；仓库证据不含密钥。

独立代次 dev-20261003-01，目录 /Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261003-01。Fullnode为 http://127.0.0.1:39400，Faucet为 http://127.0.0.1:39423。启动PID 82143，checkpoint从0推进至9时内部health返回HTTP 200。完整H0为 `3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj`。运行元数据见 evidence/20261003-isolated-dev-runtime.json；启动日志20261003-isolated-dev-start.log。复查新旧两个链进程均存在。

安全前置检查5项通过：已有目录内容保留、悬空symlink拒绝、无debug时不回退release、端口占用拒绝且不创建目录、重复／越界端口拒绝。见20261003-isolated-dev-safety-tests.log。

scripts/probe-isolated-fullnode.ts通过真实SDK binary gRPC-Web读取GetServiceInfo及checkpoint 0并核对完整H0；临时生成独立测试地址，发起一次V2 Faucet请求，再用实际WalletFullnodeReader.coins/object核对5个coin的总额和对象读取。记录请求URL且拒绝JSON-RPC请求体，探测通过。见 evidence/20261003-isolated-fullnode-probe.json 与20261003-isolated-fullnode-probe-final.log。

首次探测将GetCheckpoint的sequenceNumber错误放在顶层，SDK序列化报错；按当前SDK的checkpointId oneof修正后通过，失败日志20261003-isolated-fullnode-probe.log保留。该失败发生在发币前。esbuild有SDK sideEffects声明相关警告，运行结果已独立核实。

ENV-02完成。运维就绪脚本仍使用JSON-RPC，不能把运维探测和钱包请求审计混为一谈。本次真实验证仅覆盖节点、身份、Faucet及钱包当前coin／object读取；没有部署合约，没有新链GraphQL／archive，没有交易发送和扩展UI验收。ENV-03及后续保持未完成，钱包当前不可试用。
