# 索引追赶并发容量诊断

2026-10-04。新增的两个工具均位于用户指定 link-u-smart-contract/all-in-one-deploy/localDeploy：benchmark_wallet_guard_capacity.py 与 inspect_wallet_consumer_progress.py。没有改变任何运行配置、数据库或 checkpoint，没有重启链或消费者。

## 实际进程与来源

先通过记录的完整 OS 进程身份确认存活，再从该 PID 的 stdout 打开的实际日志读取水位，不按磁盘旧日志推测运行。当前 debug 来源核验调用既有 build_binding，对当前 RTD git 状态及 debug 二进制逐项摘要核对，query 与 KV 两套均通过。

最终证据 guard-capacity-consumers-verified.json：indexer PID30615、22 pipelines 最低162777；consistent PID65784、4 pipelines 最低101651；KV writer PID65614、14 pipelines 最低101658。均当前身份匹配。仍低于 PersonalKiosk 放入交易 checkpoint203097，不能用 Fullnode 对象替代尚未覆盖的 GraphQL 资产集合。

原始 guard-capacity-consumers.json 首次工具错误地对 query 使用 KV 的 adapterConfigSha256 字段，query 绑定比较没有证明力；修正为 query 的 adapterSha256 后重新执行完整来源与进程检查，最终两个绑定都确认与当前 adapter config SHA 不一致。前次观察文件保留，不把最初 query false 当证据。

## 有界只读负载

现有 adapter 硬编码 4 permits，消费者预算 indexer／consistent／writer 为2／1／1，guard 为8 permits。额外探针仅允许1或2并发，各24次读取固定checkpoint50000，未修改或绕过适配器。

- 额外1并发：24/24成功，中位0.371024625s，2.530249请求/s。
- 额外2并发：24/24成功，中位0.431929896s，4.200954请求/s。
- 所有成功响应的SHA256一致；随后guard独立准入检查通过。

这是两段顺序采样、活负载下的短期guard读能力证据，不是严格同负载A/B，不是消费者吞吐或持续6并发保证。它支持继续评估2／2／2消费者预算，但尚未实施。

## 扩容前必须修正的启动绑定

前次 visibility-only 传输升级已更新 adapter config 的代码摘要；仍在运行的 query／KV 客户端继续用同一地址读取，但各自 binding.json 仍引用旧 adapter config SHA。直接用原启动器重新启动会拒绝该不一致。这不是当前二进制来源错误，也不表示已停止消费。

下一步需以 guard-adapter-rebind-01 保留的旧 config、当前 inspected config、guard-transport-upgrade-02/evidence.json 的已验证覆盖层和当前 debug provenance 证明差异仅为已接受升级，再受控更新 query／KV 的适配器摘要绑定；KV manifest 中 binding.json 的摘要必须同步，先保留完整私有备份。随后才能评估并实施适配器6并发与一致的2／2／2预算，仍须保留数据、停启身份检查、旧进程记录和水位前进证据。不能只改预算绕过四permit限制，也不能因旧绑定不一致重新创建数据库。

本轮不宣称滞后消除或试用可用；TRY-05／RPC-22仍未完成，总体42/98。
